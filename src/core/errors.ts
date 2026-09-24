export class TasknestError extends Error {
	constructor(message: string) {
		super(message);
		this.name = new.target.name;
	}
}

export class ValidationError extends TasknestError {}

export class ProjectNotFoundError extends TasknestError {}

export class TaskNotFoundError extends TasknestError {}

export class InvalidStatusTransitionError extends TasknestError {}

export class InvalidProjectMarkerError extends TasknestError {}

export class ProjectBindingConflictError extends TasknestError {}
