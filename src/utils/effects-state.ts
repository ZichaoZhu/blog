export interface EffectsInput {
	savedChoice: "on" | "off" | null;
	reducedMotion: boolean;
	saveData: boolean;
	visible: boolean;
}
export interface EffectsState {
	enabled: boolean;
	allowVideoPreload: boolean;
}
export function resolveEffectsState(input: EffectsInput): EffectsState {
	const enabled =
		input.visible &&
		input.savedChoice !== "off" &&
		(input.savedChoice === "on" || !input.reducedMotion);
	return { enabled, allowVideoPreload: enabled && !input.saveData };
}
export function readEffectsState(): EffectsState {
	const saved = localStorage.getItem("firefly-effects");
	return resolveEffectsState({
		savedChoice: saved === "on" || saved === "off" ? saved : null,
		reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
		saveData:
			(navigator as Navigator & { connection?: { saveData?: boolean } })
				.connection?.saveData === true,
		visible: !document.hidden,
	});
}
