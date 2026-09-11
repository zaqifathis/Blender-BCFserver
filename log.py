"""Add-on log, shown in the BCF Log panel and in Blender's system console.

Everything logs through the standard ``logging`` module under LOGGER_NAME, so worker
threads can log freely; the panel reads ``records`` on the main thread.
"""

import collections
import logging
import sys
import time

LOGGER_NAME = "bcfserver_connect"

logger = logging.getLogger(LOGGER_NAME)
records = collections.deque(maxlen=200)  # (time, levelname, message), newest last


class _PanelHandler(logging.Handler):
    def emit(self, record):
        records.append((time.strftime("%H:%M:%S", time.localtime(record.created)), record.levelname, record.getMessage()))


def _install():
    # On add-on reload drop the handlers of the previous module instance
    for handler in list(logger.handlers):
        if getattr(handler, "bcf_connect", False):
            logger.removeHandler(handler)

    panel_handler = _PanelHandler(logging.INFO)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter("[BCF] %(asctime)s %(levelname)s %(message)s", "%H:%M:%S"))
    for handler in (panel_handler, console_handler):
        handler.bcf_connect = True
        logger.addHandler(handler)
    logger.setLevel(logging.DEBUG)  # console gets DEBUG (HTTP requests), the panel INFO and up
    logger.propagate = False


def as_text():
    return "\n".join(f"{t} {level} {message}" for t, level, message in records)


_install()
