export function writeLine(content: string): void {
	process.stdout.write(`${content}\n`);
}

export function writeError(content: string): void {
	process.stderr.write(`${content}\n`);
}
