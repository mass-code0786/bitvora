export type AdditionalEligibilityWindow={eligible:boolean;eligibilityStartedAt:Date;eligibilityEndsAt:Date|null};
export function isAdditionalTradeEligible(value:AdditionalEligibilityWindow|null|undefined,sessionStartsAt:number){return Boolean(value?.eligible&&value.eligibilityStartedAt.getTime()<=sessionStartsAt&&value.eligibilityEndsAt&&value.eligibilityEndsAt.getTime()>sessionStartsAt)}
