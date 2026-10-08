# Restaurants Firestore Access

Restaurants uses only `restaurants/{id}`. It does not write Recipes, Planner, or Groceries.
The collection query is `authorId == currentUser.uid`; sorting/search/filtering are local, so
no composite index is required. Creation and status changes use server timestamps.
UI timestamps use milliseconds, with a temporary local timestamp immediately after a write;
the next collection load reads the authoritative server value.

This repository does not contain the project's deployed Firestore rules. Before live use,
merge this owner-only match into the existing rules in Firebase, without replacing Recipe
rules. Client ownership checks are not a substitute for server rules.

```text
match /restaurants/{restaurantId} {
  allow read: if request.auth != null
    && resource.data.authorId == request.auth.uid;
  allow create: if request.auth != null
    && request.resource.data.authorId == request.auth.uid
    && request.resource.data.name is string
    && request.resource.data.name.size() > 0
    && request.resource.data.name.size() <= 160;
  allow delete: if request.auth != null
    && resource.data.authorId == request.auth.uid;
  allow update: if request.auth != null
    && resource.data.authorId == request.auth.uid
    && request.resource.data.authorId == resource.data.authorId
    && request.resource.data.name is string
    && request.resource.data.name.size() > 0
    && request.resource.data.name.size() <= 160;
}
```

Audit other matching rules too: Firestore allows a request if **any** matching rule allows it.
Test signed-out access, another user's read/write, owner changes, and the owner-scoped list
query in the Firebase Rules simulator before deploying. No rules or live data were changed
as part of this slice.

## Model Notes

`name` is the only required user-entered content. Quick Add stores owner, empty arrays,
false favorite/blacklisted flags, and timestamps. Optional future content fields are
`imageUrl`, `cuisine`, `category`, `rating`, and `notes`; `tags`, `orderLinks` (optional stable `id`, `label`, `url`),
and `dishes` (stable `id`, `name`, optional `notes`, `images`) are arrays. There are no dish
ratings or visit/order records. The optional overall rating uses 0–5 in half-star steps;
existing ratings outside that range remain readable until explicitly changed.

Restaurants and dishes now also accept optional `photos` arrays, with URL and
ImageKit file metadata. Legacy URL fields remain compatible; see
[Restaurant images](restaurant-images.md) for configuration and cleanup limits.

Status changes patch only their boolean and `updatedAt`. Text fields use expected-value
checks in ownership-checked transactions: same-field conflicts are reported, not silently
overwritten. Tags merge against the latest list. Dish/link operations target individual
stable IDs and preserve other items and unknown properties; legacy links acquire an ID on
their first edit. Ambiguous duplicate legacy links fail safely rather than editing an
arbitrary item. Removal also checks the item's displayed content where applicable.

Writes are serialized per restaurant in the client, preventing response ordering from
rolling back newer local changes. Deletion checks ownership in a transaction and removes
only the selected Restaurant document. Include the delete rule above for live use.
Text saves on blur or explicit Save, and failed text remains in the open editor. Unsaved
text is not persisted as a draft across leaving the page/refresh; there is no offline write
queue or automatic conflict override. Use latest explicitly discards that field's local text.
Duplicate name warnings are local, not a uniqueness constraint or cross-device guarantee.
The collection is fetched on entering Restaurants and retry; it is not an offline cache
or realtime listener. Restaurants has no Redux persistence or data migration.
