import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { ApiError } from "../../studio/src/server/auth";
import type { Versioned } from "../../studio/src/server/github-store";

const uuid = "[a-f\\d]{8}-[a-f\\d]{4}-[a-f\\d]{4}-[a-f\\d]{4}-[a-f\\d]{12}";
/** Worker-only partial Git reader. Never checks out files or fetches draft blobs. */
export class PinnedGitReader {
	directory: string | undefined;
	private pinned: string | undefined;
	private env: NodeJS.ProcessEnv;
	constructor(
		private remote: string,
		token: string,
	) {
		if (
			!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/.test(remote) &&
			!isAbsolute(remote)
		)
			throw new ApiError(503, "INVALID_DATA_REMOTE");
		this.env = {
			...process.env,
			GIT_TERMINAL_PROMPT: "0",
			GIT_CONFIG_NOSYSTEM: "1",
			GIT_CONFIG_GLOBAL: "/dev/null",
			GIT_CONFIG_COUNT: "1",
			GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
			GIT_CONFIG_VALUE_0: `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`,
		};
	}
	private git(args: string[], input?: string): string {
		try {
			return execFileSync("git", args, {
				cwd: this.directory,
				env: this.env,
				input,
				encoding: "utf8",
				maxBuffer: 2 * 1024 * 1024,
				timeout: 180000,
				stdio: ["pipe", "pipe", "pipe"],
			});
		} catch {
			throw new ApiError(502, "PRIVATE_GIT_READ_FAILED");
		}
	}
	private path(path: string): void {
		if (
			path !== "control.json" &&
			!new RegExp(`^(?:jobs|releases|snapshots)/${uuid}\\.json$`).test(path)
		)
			throw new ApiError(400, "INVALID_PUBLIC_INPUT_PATH");
	}
	private async open(ref: string): Promise<void> {
		if (!/^[a-f\d]{40}$/.test(ref) || (this.pinned && this.pinned !== ref))
			throw new ApiError(400, "INVALID_DATA_COMMIT");
		if (this.directory) return;
		this.directory = await mkdtemp(
			join(tmpdir(), "paper-tree-private-objects-"),
		);
		this.git(["init", "--bare", "-q"]);
		this.git(["remote", "add", "origin", this.remote]);
		this.git(["config", "remote.origin.promisor", "true"]);
		this.git(["config", "remote.origin.partialclonefilter", "blob:none"]);
		this.git([
			"fetch",
			"--depth=1",
			"--filter=blob:none",
			"--no-tags",
			"origin",
			ref,
		]);
		if (this.git(["rev-parse", "FETCH_HEAD"]).trim() !== ref)
			throw new ApiError(502, "DATA_COMMIT_MISMATCH");
		this.pinned = ref;
	}
	async prefetch(paths: readonly string[], ref: string): Promise<void> {
		for (const path of paths) this.path(path);
		await this.open(ref);
		for (let offset = 0; offset < paths.length; offset += 100) {
			const entries = this.git([
				"ls-tree",
				ref,
				"--",
				...paths.slice(offset, offset + 100),
			])
				.trim()
				.split("\n")
				.filter(Boolean);
			const ids = entries.map(
				(entry) => entry.match(/^100644 blob ([a-f\d]{40})\t/)?.[1],
			);
			if (ids.some((id) => !id)) throw new ApiError(502, "INVALID_INPUT_BLOB");
			if (ids.length)
				this.git(
					[
						"-c",
						"fetch.negotiationAlgorithm=noop",
						"fetch",
						"--no-tags",
						"--no-write-fetch-head",
						"--recurse-submodules=no",
						"--no-filter",
						"origin",
						"--stdin",
					],
					ids.join("\n") + "\n",
				);
		}
	}
	async getFile<T>(path: string, ref: string): Promise<Versioned<T> | null> {
		this.path(path);
		await this.open(ref);
		const entry = this.git(["ls-tree", ref, "--", path]).trim();
		if (!entry) return null;
		const blobSha = entry.match(/^100644 blob ([a-f\d]{40})\t/)?.[1];
		if (!blobSha) throw new ApiError(502, "INVALID_INPUT_BLOB");
		try {
			return {
				value: JSON.parse(this.git(["show", `${ref}:${path}`])) as T,
				blobSha,
			};
		} catch {
			throw new ApiError(502, "INVALID_INPUT_JSON");
		}
	}
	async dispose(): Promise<void> {
		if (this.directory)
			await rm(this.directory, { recursive: true, force: true });
		this.directory = undefined;
		this.pinned = undefined;
		delete this.env.GIT_CONFIG_VALUE_0;
	}
}
