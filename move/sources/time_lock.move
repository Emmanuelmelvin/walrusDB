module db::tle {
use std::string::String;
use sui::{bcs::{Self, BCS}, clock};

const ENoAccess: u64 = 1;
const EInvalidCap: u64 = 2;

public struct TimeLockData has key {
    id: UID,
    name: vector<u8>,
    end_time: u64
}

public struct TimeLockDataCap has key {
    id: UID,
    updatable_tle_id: ID
}

public fun create_timelock_data(end_time: u64, name: vector<u8>, ctx: &mut TxContext): TimeLockDataCap {
    let data = TimeLockData {
        id: object::new(ctx),
        name,
        end_time
    };
    transfer::share_object(data);
    TimeLockDataCap {
        id: object::new(ctx),
        updatable_tle_id: object::id(&data)
    }
}

public entry fun update_tle_end_time(tle: &mut TimeLockData, cap: &TimeLockDataCap, end_time: u64){
    assert!(cap.updatable_tle_id == object::id(tle), EInvalidCap);
    tle.end_time = end_time;
}

public entry fun create_timelock_data_entry(end_time: u64, name: String, ctx: &mut TxContext){
    transfer::transfer(create_timelock_data(end_time, name, ctx), ctx.sender())
}


fun check_policy(id: vector<u8>, c: &clock::Clock): bool {
    let mut prepared: BCS = bcs::new(id);
    let t = prepared.peel_u64();
    let leftovers = prepared.into_remainder_bytes();

    // Check that the time has passed.
    (leftovers.length() == 0) && (c.timestamp_ms() >= t)
}

entry fun seal_approve(id: vector<u8>, c: &clock::Clock) {
    assert!(check_policy(id, c), ENoAccess);
}

}
