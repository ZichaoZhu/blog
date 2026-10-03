import {test} from 'node:test';import assert from 'node:assert/strict';
import {resolveEffectsState} from '../../src/utils/effects-state';
test('saved choices, system settings, data saver and background independently lower effects',()=>{
 const input={savedChoice:null as 'on'|'off'|null,reducedMotion:false,saveData:false,visible:true};
 assert.deepEqual(resolveEffectsState(input),{enabled:true,allowVideoPreload:true});
 assert.deepEqual(resolveEffectsState({...input,savedChoice:'off'}),{enabled:false,allowVideoPreload:false});
 assert.deepEqual(resolveEffectsState({...input,reducedMotion:true}),{enabled:false,allowVideoPreload:false});
 assert.deepEqual(resolveEffectsState({...input,savedChoice:'on',reducedMotion:true,saveData:true}),{enabled:true,allowVideoPreload:false});
 assert.deepEqual(resolveEffectsState({...input,savedChoice:'on',visible:false}),{enabled:false,allowVideoPreload:false});
});
