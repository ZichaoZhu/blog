import {type NavBarConfig,type NavBarLink,type NavBarSearchConfig,NavBarSearchMethod} from '../types/navBarConfig';
export const navBarSearchConfig:NavBarSearchConfig={method:NavBarSearchMethod.PageFind};
export const LinkPresets:Record<string,NavBarLink>={};
export const navBarConfig:NavBarConfig={links:[
 {name:'首页',url:'/',icon:'material-symbols:home'},
 {name:'Notes',url:'/notes/',icon:'material-symbols:article'},
 {name:'Courses',url:'/courses/',icon:'material-symbols:school'},
 {name:'Papers',url:'/papers/',icon:'material-symbols:description'},
 {name:'Research',url:'/research/',icon:'material-symbols:science'},
 {name:'Projects',url:'/projects/',icon:'material-symbols:rocket-launch'},
]};
