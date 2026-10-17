#!/usr/bin/env python3
import argparse
import codecs
import hashlib
import json
import os
import pathlib
import random
import re
import signal
import sys
import time
from collections import deque
from typing import Any

import pexpect
import pyte


DEFAULT_ENV = {
    "TERM": "xterm-256color",
    "COLORTERM": "truecolor",
    "LANG": "en_US.UTF-8",
    "LC_ALL": "en_US.UTF-8",
}
KEY_MAP = {
    "Enter": "\r",
    "Esc": "\x1b",
    "Tab": "\t",
    "ShiftTab": "\x1b[Z",
    "Up": "\x1b[A",
    "Down": "\x1b[B",
    "Right": "\x1b[C",
    "Left": "\x1b[D",
    "Space": " ",
    "Backspace": "\x7f",
    "Delete": "\x1b[3~",
    "Home": "\x1b[H",
    "End": "\x1b[F",
    "PageUp": "\x1b[5~",
    "PageDown": "\x1b[6~",
    "Ctrl+A": "\x01",
    "Ctrl+B": "\x02",
    "Ctrl+C": "\x03",
    "Ctrl+D": "\x04",
    "Ctrl+E": "\x05",
    "Ctrl+F": "\x06",
    "Ctrl+K": "\x0b",
    "Ctrl+L": "\x0c",
    "Ctrl+N": "\x0e",
    "Ctrl+P": "\x10",
    "Ctrl+U": "\x15",
    "Ctrl+W": "\x17",
    "Ctrl+X": "\x18",
    "Ctrl+Y": "\x19",
    "Ctrl+Z": "\x1a",
}


class RecorderScreen(pyte.Screen):
    child: pexpect.spawn | None = None

    def _send(self, data: str) -> None:
        if self.child is None or not self.child.isalive():
            return
        self.child.send(data.encode("utf-8"))

    def report_device_attributes(self, mode: int = 0, *args: Any, **kwargs: Any) -> None:
        if mode == 0 and not kwargs.get("private"):
            self._send("\x1b[?62;c")

    def report_device_status(self, mode: int, **_: Any) -> None:
        if mode == 6:
            self._send(f"\x1b[{self.cursor.y + 1};{self.cursor.x + 1}R")
        elif mode == 5:
            self._send("\x1b[0n")


class QueryResponder:
    def __init__(self, child: pexpect.spawn, screen: RecorderScreen):
        self.child = child
        self.screen = screen
        self.tail = b""
        self.osc_re = re.compile(br"\x1b\](?P<body>.*?)(?:\x07|\x1b\\)", re.S)
        self.csi_re = re.compile(br"\x1b\[(?P<params>[0-9;?<>]*)?(?P<final>[@-~])")
        self.dcs_re = re.compile(br"\x1bP(?P<body>.*?)(?:\x1b\\)", re.S)

    def _reply(self, text: str) -> None:
        if self.child.isalive():
            self.child.send(text.encode("utf-8"))

    def _handle_csi(self, params: str, final: str) -> None:
        if final == "n":
            if params == "6":
                self._reply(f"\x1b[{self.screen.cursor.y + 1};{self.screen.cursor.x + 1}R")
            elif params == "5":
                self._reply("\x1b[0n")
        elif final == "c":
            if params.startswith(">"):
                self._reply("\x1b[>0;95;0c")
            else:
                self._reply("\x1b[?62;c")
        elif final == "q" and params.startswith(">"):
            self._reply("\x1bP>|GitHubCopilotRecorder 1.0\x1b\\")

    def _handle_osc(self, body: bytes) -> None:
        if body.startswith(b"10;") or body.startswith(b"11;"):
            # Gracefully ignore color queries; Copilot continues fine without a reply.
            return

    def _handle_dcs(self, body: bytes) -> None:
        if body.startswith(b">|"):
            self._reply("\x1bP>|GitHubCopilotRecorder 1.0\x1b\\")

    def feed(self, data: bytes) -> None:
        combined = self.tail + data
        last_complete_end = 0
        for match in self.csi_re.finditer(combined):
            last_complete_end = max(last_complete_end, match.end())
            self._handle_csi((match.group("params") or b"").decode("ascii", "ignore"), match.group("final").decode("ascii", "ignore"))
        for match in self.osc_re.finditer(combined):
            last_complete_end = max(last_complete_end, match.end())
            self._handle_osc(match.group("body"))
        for match in self.dcs_re.finditer(combined):
            last_complete_end = max(last_complete_end, match.end())
            self._handle_dcs(match.group("body"))
        last_esc = combined.rfind(b"\x1b")
        if last_esc == -1 or last_esc < last_complete_end:
            self.tail = b""
        else:
            self.tail = combined[last_esc:][:128]


class Recorder:
    def __init__(self, args: argparse.Namespace):
        self.args = args
        self.out_path = pathlib.Path(args.out)
        self.snap_dir = self.out_path.with_suffix(self.out_path.suffix + ".snapshots")
        self.marks_path = pathlib.Path(str(self.out_path) + ".marks.json")
        self.snap_dir.mkdir(parents=True, exist_ok=True)
        self.out_path.parent.mkdir(parents=True, exist_ok=True)
        self.screen = RecorderScreen(args.cols, args.rows)
        self.stream = pyte.ByteStream(self.screen)
        self.decoder = codecs.getincrementaldecoder("utf-8")("replace")
        self.recent_output: deque[str] = deque(maxlen=256)
        self.mark_records: list[dict[str, Any]] = []
        self.start_wall = time.time()
        self.cast = self.out_path.open("w", encoding="utf-8", newline="\n")
        self.child: pexpect.spawn | None = None
        self.query_responder: QueryResponder | None = None
        self.stop_requested = False
        self.current_op = "startup"
        self.screen.child = None

    def now(self) -> float:
        return time.time() - self.start_wall

    def log(self, message: str) -> None:
        print(f"[{self.now():7.2f}s] {message}", file=sys.stderr, flush=True)

    def write_cast(self, item: list[Any]) -> None:
        self.cast.write(json.dumps(item, ensure_ascii=False) + "\n")
        self.cast.flush()

    def screen_text(self) -> str:
        try:
            lines = self.screen.display
        except Exception:
            # pyte 의 display 는 빈 셀(와이드 문자 처리)에서 IndexError 가 날 수 있어 직접 렌더링한다
            buf = self.screen.buffer
            lines = ["".join((buf[y][x].data or " ") for x in range(self.screen.columns)) for y in range(self.screen.lines)]
        return "\n".join(line.rstrip() for line in lines)

    def screen_hash(self) -> str:
        return hashlib.sha256(self.screen_text().encode("utf-8", "replace")).hexdigest()[:16]

    def append_mark_record(self, kind: str, payload: dict[str, Any]) -> None:
        self.mark_records.append({
            "t": round(self.now(), 6),
            "wall": time.time(),
            "kind": kind,
            "screen_hash": self.screen_hash(),
            **payload,
        })
        self.marks_path.write_text(json.dumps(self.mark_records, ensure_ascii=False, indent=2), encoding="utf-8")

    def debug_snapshot(self, name: str) -> pathlib.Path:
        path = self.snap_dir / f"{name}.txt"
        path.write_text(self.screen_text() + "\n", encoding="utf-8")
        return path

    def send_input(self, text: str) -> None:
        assert self.child is not None
        self.child.send(text.encode("utf-8"))
        self.write_cast([round(self.now(), 6), "i", text])

    def read_once(self, timeout: float = 0.1) -> bool:
        assert self.child is not None
        try:
            data = self.child.read_nonblocking(65536, timeout=timeout)
        except pexpect.TIMEOUT:
            return True
        except pexpect.EOF:
            return False
        if data:
            assert self.query_responder is not None
            self.query_responder.feed(data)
            self.stream.feed(data)
            decoded = self.decoder.decode(data, final=False)
            if decoded:
                self.recent_output.append(decoded)
                self.write_cast([round(self.now(), 6), "o", decoded])
        return True

    def pump_until(self, predicate, timeout: float, poll: float = 0.1):
        deadline = time.time() + timeout
        while time.time() < deadline:
            if self.stop_requested:
                raise KeyboardInterrupt("stop requested")
            alive = self.read_once(timeout=min(poll, max(0.01, deadline - time.time())))
            if predicate(alive):
                return True
            if not alive and self.child and not self.child.isalive():
                if predicate(False):
                    return True
                break
        return False

    def wait_for(self, pattern: str, timeout: float, where: str = "screen") -> None:
        regex = re.compile(pattern, re.S)

        def predicate(_alive: bool) -> bool:
            haystack = self.screen_text() if where == "screen" else "".join(self.recent_output)
            return bool(regex.search(haystack))

        if not self.pump_until(predicate, timeout):
            snap = self.debug_snapshot(f"timeout-wait_for-{int(self.now())}")
            raise RuntimeError(f"wait_for timeout: {pattern!r}; snapshot={snap}")

    def wait_absent(self, pattern: str, timeout: float) -> None:
        regex = re.compile(pattern, re.S)

        def predicate(_alive: bool) -> bool:
            return not regex.search(self.screen_text())

        if not self.pump_until(predicate, timeout):
            snap = self.debug_snapshot(f"timeout-wait_absent-{int(self.now())}")
            raise RuntimeError(f"wait_absent timeout: {pattern!r}; snapshot={snap}")

    def wait_idle(self, quiet: float, timeout: float, ignore: str | None = None) -> None:
        ignore_re = re.compile(ignore, re.S) if ignore else None
        last_change = time.time()
        previous = None

        def normalized() -> str:
            lines = self.screen_text().splitlines()
            if ignore_re:
                lines = [line for line in lines if not ignore_re.search(line)]
            return "\n".join(lines)

        def predicate(_alive: bool) -> bool:
            nonlocal previous, last_change
            current = normalized()
            if current != previous:
                previous = current
                last_change = time.time()
            return time.time() - last_change >= quiet

        if not self.pump_until(predicate, timeout):
            snap = self.debug_snapshot(f"timeout-wait_idle-{int(self.now())}")
            raise RuntimeError(f"wait_idle timeout after {timeout}s; snapshot={snap}")

    def op_type(self, step: dict[str, Any]) -> None:
        text = step.get("text", "")
        cps = float(step.get("cps", 14))
        jitter = float(step.get("jitter", 0.4))
        paste = bool(step.get("paste", False))
        enter = bool(step.get("enter", False))
        payload = text
        if paste:
            payload = f"\x1b[200~{text}\x1b[201~"
            if enter:
                payload += "\r"
            self.send_input(payload)
            return
        for ch in text:
            self.send_input(ch)
            base = 1.0 / max(cps, 0.1)
            spread = base * jitter
            time.sleep(max(0.01, random.uniform(base - spread, base + spread)))
            self.read_once(timeout=0.01)
        if enter:
            self.send_input("\r")

    def op_key(self, step: dict[str, Any]) -> None:
        delay = float(step.get("delay", 0.12))
        for key in step.get("keys", []):
            if key not in KEY_MAP:
                raise KeyError(f"unsupported key: {key}")
            self.send_input(KEY_MAP[key])
            time.sleep(delay)
            self.read_once(timeout=0.01)

    def op_mark(self, step: dict[str, Any]) -> None:
        data = step.get("data", {})
        self.write_cast([round(self.now(), 6), "m", json.dumps(data, ensure_ascii=False)])
        self.append_mark_record("marker", {"data": data})

    def op_snapshot(self, step: dict[str, Any]) -> None:
        name = step.get("name", f"snapshot-{int(self.now())}")
        path = self.debug_snapshot(name)
        self.append_mark_record("snapshot", {"name": name, "path": str(path)})

    def op_expect_exit(self, step: dict[str, Any]) -> None:
        timeout = float(step.get("timeout", 30))

        def predicate(_alive: bool) -> bool:
            return self.child is not None and not self.child.isalive()

        if not self.pump_until(predicate, timeout):
            raise RuntimeError(f"expect_exit timeout after {timeout}s")


    def emit_marks(self, marks: list[dict[str, Any]]) -> None:
        for data in marks or []:
            self.op_mark({"data": data})

    def op_auto(self, step: dict[str, Any]) -> None:
        """권한 요청·질문 대화상자를 감지해 사람처럼 응답하며, 에이전트 작업이 끝날 때까지 진행한다.

        handlers: [{"name","pattern","pre_marks":[...],"hold":초,"keys":[...]|"text":"..","post_marks":[...],"max":N,"snapshot":"name"}]
        busy: 작업 중 표시 정규식(기본 "Working"), quiet: busy 가 이 시간 동안 사라지면 종료
        """
        handlers = step.get("handlers", [])
        busy_re = re.compile(step.get("busy", r"Working|esc (again to )?interrupt|esc edit prompt"))
        quiet = float(step.get("quiet", 6.0))
        deadline = time.time() + float(step.get("timeout", 900))
        counts: dict[str, int] = {}
        used_rules: set[str] = set()
        absent_since: float | None = None
        compiled = [(h, re.compile(h["pattern"], re.S)) for h in handlers]
        while time.time() < deadline:
            if self.stop_requested:
                raise KeyboardInterrupt("stop requested")
            alive = self.read_once(timeout=0.15)
            text = self.screen_text()
            handled = False
            for handler, regex in compiled:
                name = handler.get("name", handler["pattern"])
                if not regex.search(text) or counts.get(name, 0) >= int(handler.get("max", 99)):
                    continue
                counts[name] = counts.get(name, 0) + 1
                self.log(f"auto handler: {name} (#{counts[name]})")
                self.append_mark_record("auto_handler", {"name": name, "count": counts[name]})
                self.pump_until(lambda _a: False, float(handler.get("settle", 0.6)))
                if handler.get("snapshot"):
                    self.debug_snapshot(f"{handler['snapshot']}-{counts[name]}")
                self.emit_marks(handler.get("pre_marks"))
                self.pump_until(lambda _a: False, float(handler.get("hold", 3.0)))
                if handler.get("text") is not None:
                    self.op_type({"text": handler["text"], "cps": handler.get("cps", 14), "enter": handler.get("enter", True)})
                keys = handler.get("keys")
                answer_text = None
                selector = None
                for ridx, rule in enumerate(handler.get("rules", [])):
                    rule_key = f"{name}#{ridx}"
                    if rule.get("once") and rule_key in used_rules:
                        continue
                    # 화면 텍스트에 따라 선택을 달리한다 (예: 특정 질문에서는 '직접 입력')
                    scope = self.screen_text()
                    anchor = handler.get("anchor")
                    if anchor and anchor in scope:
                        scope = scope[scope.rfind(anchor):]  # 화면에 남은 이전 대화 내용은 제외하고 현재 대화상자만 본다
                    if not rule.get("if") or re.search(rule["if"], scope, re.S):
                        keys = rule.get("keys")
                        answer_text = rule.get("text")
                        selector = rule.get("select")
                        used_rules.add(rule_key)
                        break
                if selector:
                    # 커서(❯)가 해당 줄에 올 때까지 아래로 이동 (선택지 개수를 몰라도 동작)
                    target = re.compile(selector)
                    for _ in range(10):
                        lines = self.screen_text().splitlines()
                        if any(target.search(ln) and ln.lstrip().startswith("❯") for ln in lines):
                            break
                        self.op_key({"keys": ["Down"], "delay": 0.45})
                        self.pump_until(lambda _a: False, 0.25)
                if keys:
                    self.op_key({"keys": keys, "delay": handler.get("delay", 0.35)})
                if answer_text:
                    self.pump_until(lambda _a: False, 0.6)
                    self.op_type({"text": answer_text, "cps": handler.get("cps", 14), "enter": False})
                    self.pump_until(lambda _a: False, 1.5)
                    self.op_key({"keys": ["Enter"], "delay": 0.2})
                self.emit_marks(handler.get("post_marks"))
                # 같은 대화상자가 다시 감지되지 않도록 사라질 때까지 대기
                self.pump_until(lambda _a: not regex.search(self.screen_text()), float(handler.get("clear_timeout", 8.0)))
                handled = True
                absent_since = None
                break
            if handled:
                continue
            if not busy_re.search(text):
                absent_since = absent_since or time.time()
                if time.time() - absent_since >= quiet:
                    return
            else:
                absent_since = None
            if not alive and self.child and not self.child.isalive():
                return
        snap = self.debug_snapshot(f"timeout-auto-{int(self.now())}")
        raise RuntimeError(f"auto timeout; snapshot={snap}")


    def op_expect_file(self, step: dict[str, Any]) -> None:
        """단계 산출물(파일)이 생길 때까지 기다린다. 없으면 녹화를 중단해 엉뚱한 진행을 막는다."""
        path = pathlib.Path(self.args.cwd) / step["path"]
        timeout = float(step.get("timeout", 120))
        if not self.pump_until(lambda _a: path.exists(), timeout):
            snap = self.debug_snapshot(f"timeout-expect_file-{int(self.now())}")
            raise RuntimeError(f"expected file missing: {path}; snapshot={snap}")

    def run_step(self, index: int, step: dict[str, Any]) -> None:
        op = step["op"]
        self.current_op = f"{index + 1}:{op}"
        self.log(f"op {self.current_op}")
        self.append_mark_record("op_start", {"index": index, "op": op, "step": step})
        if op == "wait_for":
            self.wait_for(step["pattern"], float(step.get("timeout", 120)), step.get("where", "screen"))
        elif op == "wait_idle":
            self.wait_idle(float(step.get("quiet", 3.0)), float(step.get("timeout", 900)), step.get("ignore"))
        elif op == "wait_absent":
            self.wait_absent(step["pattern"], float(step.get("timeout", 900)))
        elif op == "type":
            self.op_type(step)
        elif op == "key":
            self.op_key(step)
        elif op == "sleep":
            self.pump_until(lambda _a: False, float(step.get("seconds", 1.0)))
        elif op == "mark":
            self.op_mark(step)
        elif op == "snapshot":
            self.op_snapshot(step)
        elif op == "expect_exit":
            self.op_expect_exit(step)
        elif op == "auto":
            self.op_auto(step)
        elif op == "expect_file":
            self.op_expect_file(step)
        else:
            raise KeyError(f"unsupported op: {op}")
        self.append_mark_record("op_end", {"index": index, "op": op})

    def close_child(self) -> None:
        if self.child is None:
            return
        if self.child.isalive():
            try:
                self.child.kill(signal.SIGTERM)
                time.sleep(0.2)
            except Exception:
                pass
        try:
            self.child.close(force=True)
        except Exception:
            pass

    def run(self) -> int:
        env = dict(os.environ)
        env.update(DEFAULT_ENV)
        for item in self.args.env or []:
            key, value = item.split("=", 1)
            env[key] = value
        header = {
            "version": 2,
            "width": self.args.cols,
            "height": self.args.rows,
            "timestamp": int(self.start_wall),
            "env": {"TERM": env.get("TERM", "xterm-256color")},
        }
        self.cast.write(json.dumps(header, ensure_ascii=False) + "\n")
        self.cast.flush()

        def on_signal(signum, _frame):
            self.stop_requested = True
            self.log(f"signal {signum} received")

        previous_handlers = {sig: signal.signal(sig, on_signal) for sig in (signal.SIGINT, signal.SIGTERM)}
        try:
            self.child = pexpect.spawn(
                self.args.command[0],
                args=self.args.command[1:],
                cwd=self.args.cwd,
                env=env,
                dimensions=(self.args.rows, self.args.cols),
                encoding=None,
            )
            self.screen.child = self.child
            self.query_responder = QueryResponder(self.child, self.screen)
            steps = json.loads(pathlib.Path(self.args.steps).read_text(encoding="utf-8"))
            try:
                for idx, step in enumerate(steps):
                    self.run_step(idx, step)
                self.read_once(timeout=0.05)
                return 0
            finally:
                try:
                    tail = self.decoder.decode(b"", final=True)
                    if tail:
                        self.write_cast([round(self.now(), 6), "o", tail])
                except Exception:
                    pass
        finally:
            self.close_child()
            self.cast.flush()
            self.cast.close()
            for sig, handler in previous_handlers.items():
                signal.signal(sig, handler)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Record PTY sessions to asciicast-like output")
    parser.add_argument("--out", required=True)
    parser.add_argument("--steps", required=True)
    parser.add_argument("--cwd", required=True)
    parser.add_argument("--cols", type=int, default=110)
    parser.add_argument("--rows", type=int, default=32)
    parser.add_argument("--env", action="append")
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    if args.command and args.command[0] == "--":
        args.command = args.command[1:]
    if not args.command:
        parser.error("command required after --")
    return args


def main() -> int:
    # 새 세션으로 분리해 부모 셸/도구의 프로세스 그룹 종료 신호가 녹화 도중 전달되지 않게 한다
    try:
        os.setsid()
    except OSError:
        pass
    signal.signal(signal.SIGHUP, signal.SIG_IGN)

    args = parse_args()
    try:
        return Recorder(args).run()
    except Exception as exc:
        import traceback; traceback.print_exc(); print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
