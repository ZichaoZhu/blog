export interface SiteContext {mode:'preview'|'production';origin:URL;noindex:boolean}
export function resolveSiteContext(env:{SITE_MODE?:string;SITE_ORIGIN?:string}):SiteContext {
 const mode=env.SITE_MODE??'preview';if(mode!=='preview'&&mode!=='production')throw new Error('Invalid SITE_MODE');
 const origin=new URL(env.SITE_ORIGIN||(mode==='preview'?'http://127.0.0.1:4321/':'https://localhost/'));
 if(mode==='production'&&(!env.SITE_ORIGIN||origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||/^(localhost|127\..*|\[::1\])$|\.localhost$/.test(origin.hostname)))throw new Error('Production requires a confirmed HTTPS origin without credentials or a path');
 return {mode,origin,noindex:mode==='preview'};
}
const runtime=typeof process!=='undefined'?process.env:{};
export const siteContext:SiteContext=resolveSiteContext({SITE_MODE:import.meta.env?.PUBLIC_SITE_MODE??runtime.SITE_MODE,SITE_ORIGIN:import.meta.env?.PUBLIC_SITE_ORIGIN??runtime.SITE_ORIGIN});
