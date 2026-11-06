from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ApiError(Exception):
    def __init__(self, status: int, code: str, detail: str, hint: str | None = None, **extra):
        self.status, self.code, self.detail, self.hint, self.extra = status, code, detail, hint, extra

    def body(self) -> dict:
        return {"detail": self.detail, "code": self.code, "hint": self.hint, **self.extra}


def install_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def api_error(_: Request, exc: ApiError):
        return JSONResponse(status_code=exc.status, content=exc.body())

    @app.exception_handler(RequestValidationError)
    async def bad_request(_: Request, exc: RequestValidationError):
        missing = [".".join(str(p) for p in e["loc"][1:]) for e in exc.errors() if e.get("type") == "missing"]
        detail = f"Falta el campo {', '.join(missing)} en el formulario." if missing else "La solicitud no tiene el formato esperado."
        return JSONResponse(
            status_code=400,
            content={"detail": detail, "code": "solicitud_invalida", "hint": "Mandá la foto como multipart/form-data en el campo file."},
        )
