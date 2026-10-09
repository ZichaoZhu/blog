import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	loadPublicTrees,
	type PublicTreeInput,
	readSnapshot,
	validateInput,
} from "../../src/features/paper-trees/public-build";
import { isPublicNote, type NoteRecord } from "../../src/utils/note-model";
import { ApiError } from "../../studio/src/server/auth";
import type { GitHubTreeStore } from "../../studio/src/server/github-store";
import {
	type ReleaseJob,
	validateControl,
	validateJob,
	validateManifest,
} from "../../studio/src/server/release";
import type { PaperCatalog } from "./catalog";

export interface PreparationDependencies {
	store: Pick<GitHubTreeStore, "getFile">;
	catalog: PaperCatalog;
	notes: readonly NoteRecord[];
	sourceSha(): Promise<string>;
}
export async function prepareRelease(
	job: ReleaseJob,
	dataSha: string,
	outDir: string,
	deps: PreparationDependencies,
): Promise<PublicTreeInput> {
	if (
		!/^[a-f\d]{40}$/.test(dataSha) ||
		(await deps.sourceSha()) !== job.codeSha ||
		deps.catalog.codeSha !== job.codeSha
	)
		throw new ApiError(409, "SOURCE_VERSION_MISMATCH");
	const read = async (path: string): Promise<unknown> => {
		const file = await deps.store.getFile(path, dataSha);
		if (!file) throw new ApiError(502, "PINNED_INPUT_MISSING");
		return file.value;
	};
	const frozenJob = validateJob(await read(`jobs/${job.jobId}.json`));
	const control = validateControl(await read("control.json"));
	if (
		JSON.stringify(frozenJob) !== JSON.stringify(job) ||
		control.activeJobId !== job.jobId
	)
		throw new ApiError(409, "PINNED_JOB_MISMATCH");
	const release = validateManifest(
		await read(`releases/${job.releaseId}.json`),
	);
	if (
		release.releaseId !== job.releaseId ||
		release.codeSha !== job.codeSha ||
		release.createdAt !== job.createdAt ||
		release.parentReleaseId !== control.activeReleaseId
	)
		throw new ApiError(409, "PINNED_RELEASE_MISMATCH");
	const publicIds = new Set(
		deps.notes
			.filter((note) => note.data.type === "paper" && isPublicNote(note))
			.map((note) => note.data.id),
	);
	release.entries = Object.fromEntries(
		Object.entries(release.entries).filter(([id]) => publicIds.has(id)),
	);
	const ids = new Map<string, string>(
		Object.entries(release.entries).map(([paperId, id]) => [id, paperId]),
	);
	const visited = new Set<string>();
	let historyId = control.activeReleaseId;
	while (historyId) {
		if (visited.has(historyId) || visited.size >= 10000)
			throw new ApiError(502, "INVALID_RELEASE_HISTORY");
		visited.add(historyId);
		const historical = validateManifest(
			await read(`releases/${historyId}.json`),
		);
		if (historical.releaseId !== historyId)
			throw new ApiError(502, "INVALID_RELEASE_HISTORY");
		for (const [paperId, id] of Object.entries(historical.entries))
			if (publicIds.has(paperId)) {
				if (ids.has(id) && ids.get(id) !== paperId)
					throw new ApiError(502, "SNAPSHOT_PAPER_MISMATCH");
				ids.set(id, paperId);
			}
		historyId = historical.parentReleaseId;
	}
	const snapshots = [];
	for (const [id, paperId] of ids) {
		const snapshot = readSnapshot(await read(`snapshots/${id}.json`));
		if (snapshot.snapshotId !== id || snapshot.paperId !== paperId)
			throw new ApiError(502, "SNAPSHOT_PAPER_MISMATCH");
		snapshots.push(snapshot);
	}
	const input = validateInput({ release, snapshots });
	loadPublicTrees(input, deps.notes);
	// The destination is a fresh, ignored, public-only directory. Never copy private storage.
	await mkdir(join(outDir, "snapshots"), { recursive: true });
	await writeFile(join(outDir, "release.json"), JSON.stringify(input.release));
	await writeFile(
		join(outDir, "snapshot-ids.json"),
		JSON.stringify([...ids.keys()]),
	);
	for (const snapshot of snapshots)
		await writeFile(
			join(outDir, "snapshots", `${snapshot.snapshotId}.json`),
			JSON.stringify(snapshot),
		);
	return input;
}
