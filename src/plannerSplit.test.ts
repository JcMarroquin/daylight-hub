import {test} from 'node:test';
import assert from 'node:assert/strict';
import {plannerSplitAt,clampPlannerSplit,plannerSplitBounds,defaultPlannerSplit} from './plannerSplit.ts';
test('divider uses the local pane position and stores a proportional split',()=>{assert.equal(plannerSplitAt(450,200,1000),25);assert.equal(plannerSplitAt(650,150,2000),25);});
test('drag limits preserve usable library and calendar widths',()=>{const {min,max}=plannerSplitBounds(800);assert.equal(min,20);assert.equal(max,50);assert.equal(plannerSplitAt(-100,0,800),min);assert.equal(plannerSplitAt(1000,0,800),max);assert.equal(clampPlannerSplit(22,500),32);assert.equal(plannerSplitBounds(500).max,32);});
test('saved split stays responsive and invalid values recover to the default',()=>{assert.equal(clampPlannerSplit(NaN,1000),defaultPlannerSplit);assert.equal(clampPlannerSplit(30,1000),30);assert.equal(clampPlannerSplit(30,500),32);assert.equal(clampPlannerSplit(30,1000),30);});
