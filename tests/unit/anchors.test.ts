import {test} from 'node:test';import assert from 'node:assert/strict';import {buildAnchorAliases} from '../../scripts/migration/anchors';
test('only changed heading ids become aliases and mismatched headings cannot be guessed',()=>{assert.deepEqual(buildAnchorAliases(['intro','old'],['intro','new']),{old:'new'});assert.throws(()=>buildAnchorAliases(['a'],['b','c']),/heading count/);});
