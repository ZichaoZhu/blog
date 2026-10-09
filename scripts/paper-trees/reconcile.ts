import type { ReleaseJob } from "../../studio/src/server/release";
import {
	assertDeployment,
	type DeploymentRecord,
	type PublishDependencies,
	readLive,
	recordSuccess,
} from "./publish";
export async function reconcileRelease(
	jobId: string,
	deps: PublishDependencies,
): Promise<ReleaseJob> {
	const { job, control } = await readLive(jobId, deps);
	if (job.state === "published" || control.activeJobId !== jobId) return job;
	// Run completion alone does not prove that an asynchronous promotion failed.
	await deps.workflowRuns();
	if (!job.deploymentId) return job;
	try {
		const candidate = await deps.provider.getDeployment(job.deploymentId);
		assertDeployment(candidate, job, deps.projectId);
		const formal = await deps.provider.getFormalDeployment();
		assertDeployment(formal, job, deps.projectId);
		if (formal.id !== candidate.id) return job;
		await deps.provider.verifyFormal(formal, job);
		let formalStudio: DeploymentRecord | undefined;
		if (job.mode === "code") {
			if (
				!job.studioDeploymentId ||
				!deps.studioProvider ||
				!deps.studioProjectId
			)
				return job;
			const studioCandidate = await deps.studioProvider.getDeployment(
				job.studioDeploymentId,
			);
			assertDeployment(studioCandidate, job, deps.studioProjectId);
			formalStudio = await deps.studioProvider.getFormalDeployment();
			assertDeployment(formalStudio, job, deps.studioProjectId);
			if (formalStudio.id !== studioCandidate.id) return job;
			await deps.studioProvider.verifyFormal(formalStudio, job);
		}
		return await recordSuccess(jobId, deps, formal, formalStudio);
	} catch {
		return job;
	}
}
