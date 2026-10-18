import { test } from "node:test";
import { doesNotThrow, throws } from "node:assert/strict";
import { assertNoLinkedRecords, assertOwnerRole } from "./owner-access";

test("owner admin can access the platform-wide dashboard", () => {
  doesNotThrow(() => assertOwnerRole([{ role: "admin" }]));
});
test("ordinary sellers cannot access the owner dashboard", () => {
  throws(() => assertOwnerRole([{ role: "organizer" }, { role: "user" }]));
});
test("missing permissions deny access", () => {
  throws(() => assertOwnerRole([]));
});
test("records without sales can be deleted", () => {
  doesNotThrow(() => assertNoLinkedRecords(0, "blocked"));
});
test("records with sales cannot be deleted", () => {
  throws(() => assertNoLinkedRecords(1, "blocked"), /blocked/);
});