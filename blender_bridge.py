"""Run callables on Blender's main thread from the web server's worker threads.

bpy is not thread-safe, so the WebSocket handlers queue work here and block until a
main-thread timer has executed it.
"""

import queue
import threading

import bpy

POLL_INTERVAL = 0.05  # seconds between queue checks on the main thread
_jobs = queue.Queue()


class _Job:
    def __init__(self, fn, args):
        self.fn, self.args = fn, args
        self.done = threading.Event()
        self.result = None
        self.error = None


def _poll():
    while True:
        try:
            job = _jobs.get_nowait()
        except queue.Empty:
            break
        try:
            job.result = job.fn(*job.args)
        except Exception as e:
            job.error = e
        job.done.set()
    return POLL_INTERVAL


def start():
    if not bpy.app.timers.is_registered(_poll):
        bpy.app.timers.register(_poll, persistent=True)


def stop():
    if bpy.app.timers.is_registered(_poll):
        bpy.app.timers.unregister(_poll)


def run_on_main(fn, *args, timeout=60):
    """Call ``fn(*args)`` on the main thread and return its result, re-raising its exception."""
    job = _Job(fn, args)
    _jobs.put(job)
    if not job.done.wait(timeout):
        raise TimeoutError("Blender did not respond in time")
    if job.error is not None:
        raise job.error
    return job.result
