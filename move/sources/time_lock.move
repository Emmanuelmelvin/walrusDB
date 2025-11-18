module db::tle {

use sui::{bcs::{Self, BCS}, clock};

const ENoAccess: u64 = 77;


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
