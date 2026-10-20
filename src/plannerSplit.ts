export const defaultPlannerSplit=22;
export function plannerSplitBounds(width:number){const safe=Math.max(1,width),min=Math.min(48,160/safe*100);return {min,max:Math.max(min,Math.min(50,(safe-360)/safe*100))};}
export function clampPlannerSplit(ratio:number,width:number){const {min,max}=plannerSplitBounds(width);return Math.max(min,Math.min(max,Number.isFinite(ratio)?ratio:defaultPlannerSplit));}
export function plannerSplitAt(pointerX:number,left:number,width:number){return clampPlannerSplit((pointerX-left)/Math.max(1,width)*100,width);}
