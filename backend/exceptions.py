class SalesClawError(Exception):
    """Base exception for SalesClaw application"""
    def __init__(self, message: str, code: str = "INTERNAL_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class OntologyValidationError(SalesClawError):
    def __init__(self, message: str):
        super().__init__(message, "ONTOLOGY_VALIDATION_ERROR")


class ActionExecutionError(SalesClawError):
    def __init__(self, message: str):
        super().__init__(message, "ACTION_EXECUTION_ERROR")


class PermissionDeniedError(SalesClawError):
    def __init__(self, message: str):
        super().__init__(message, "PERMISSION_DENIED")
