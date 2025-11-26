import { AllowList } from "../patterns/allowList"
import { PatternToolKit } from "../patterns/patterns"
import { PrivateData } from "../patterns/privateData"
import { Subscripion } from "../patterns/subscription"
import { TimeLock } from "../patterns/timeLock"

export class PatternAggregator extends PatternToolKit {
    constructor(
        protected readonly allowListPattern: AllowList,
        protected readonly privateDataPattern: PrivateData,
        protected readonly subscriptionPattern: Subscripion,
        protected readonly timeLockPattern: TimeLock
    ) { super() }
}