import { ApiError } from "../../studio/src/server/auth";
import { validateControl, validateJob } from "../../studio/src/server/release";
import {
	assertDeployment,
	type PublishDependencies,
	recordSuccess,
} from "./publish";
/** Emergency operator action: restores the entire archived site, including articles and assets. */
export async function restoreCodeDeployment(
	jobId: string,
	fullSiteConfirmed: boolean,
	deps: PublishDependencies,
): Promise<void> {
	if (!fullSiteConfirmed || !deps.studioProvider || !deps.studioProjectId)
		throw new ApiError(400, "FULL_SITE_ROLLBACK_CONFIRMATION_REQUIRED");
	if (!/^[a-f\d-]{36}$/.test(jobId)) throw new ApiError(400, "INVALID_JOB_ID");
	const head = await deps.store.getHead();
	const control = validateControl(
		(await deps.store.getFile("control.json", head.sha))?.value,
	);
	if (control.activeJobId) throw new ApiError(409, "RELEASE_BUSY");
	const job = validateJob(
		(await deps.store.getFile(`jobs/${jobId}.json`, head.sha))?.value,
	);
	if (
		job.jobId !== jobId ||
		job.state !== "published" ||
		job.mode !== "code" ||
		!job.deploymentId ||
		!job.studioDeploymentId
	)
		throw new ApiError(400, "SUCCESSFUL_CODE_JOB_REQUIRED");
	await deps.provider.checkProtection();
	await deps.studioProvider.checkProtection();
	const blog = await deps.provider.getDeployment(job.deploymentId);
	const studio = await deps.studioProvider.getDeployment(
		job.studioDeploymentId,
	);
	assertDeployment(blog, job, deps.projectId);
	assertDeployment(studio, job, deps.studioProjectId);
	// Reuse the known successful identity so interrupted switching uses normal reconciliation.
	await deps.store.commitFiles(head, {
		"control.json": JSON.stringify({ ...control, activeJobId: jobId }),
		[`jobs/${jobId}.json`]: JSON.stringify({
			...job,
			state: "deploying",
			updatedAt: new Date().toISOString(),
		}),
	});
	// Failure here retains the lock and both archived IDs.
	await deps.provider.promote(blog);
	await deps.studioProvider.promote(studio);
	const formal = await deps.provider.getFormalDeployment();
	const formalStudio = await deps.studioProvider.getFormalDeployment();
	assertDeployment(formal, job, deps.projectId);
	assertDeployment(formalStudio, job, deps.studioProjectId);
	if (formal.id !== blog.id || formalStudio.id !== studio.id)
		throw new ApiError(502, "FORMAL_DEPLOYMENT_MISMATCH");
	await deps.provider.verifyFormal(formal, job);
	await deps.studioProvider.verifyFormal(formalStudio, job);
	await recordSuccess(jobId, deps, formal, formalStudio);
}
