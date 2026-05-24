import assert from "node:assert/strict";
import test from "node:test";
import {
  createTrip,
  deleteReservationFromTrip,
  deleteTrip,
  getActiveTrip,
  getTrip,
  listTrips,
  setActiveTrip,
  updateTrip,
} from "@/lib/travelAssistant/tripStore";
import { generateId } from "@/lib/utils/generateId";

test("tripStore supports create/list/get/update/delete", async () => {
  const userId = `trip-store-test-${generateId()}`;

  const created = await createTrip(
    {
      name: "Business NYC",
      destination: "New York, NY",
      startDate: "2026-07-01",
      endDate: "2026-07-06",
      stage: "readiness",
    },
    userId,
  );

  assert.ok(created.id.length > 0);
  assert.equal(created.name, "Business NYC");

  const listed = await listTrips(userId);
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.id, created.id);

  const byId = await getTrip(created.id, userId);
  assert.equal(byId?.destination, "New York, NY");

  const updated = await updateTrip(
    created.id,
    {
      stage: "airport",
      tripStatus: "yellow",
      minutesToDeparture: 95,
    },
    userId,
  );
  assert.equal(updated?.stage, "airport");
  assert.equal(updated?.minutesToDeparture, 95);

  const active = await getActiveTrip(userId);
  assert.equal(active?.id, created.id);

  const removed = await deleteTrip(created.id, userId);
  assert.equal(removed, true);

  const afterDelete = await listTrips(userId);
  assert.equal(afterDelete.length, 0);
});

test("tripStore setActiveTrip switches active id", async () => {
  const userId = `trip-store-active-${generateId()}`;
  const first = await createTrip(
    {
      name: "Trip A",
      destination: "Austin",
      startDate: "2026-08-01",
      endDate: "2026-08-04",
      stage: "readiness",
    },
    userId,
  );
  const second = await createTrip(
    {
      name: "Trip B",
      destination: "Seattle",
      startDate: "2026-08-10",
      endDate: "2026-08-14",
      stage: "readiness",
    },
    userId,
  );

  assert.equal((await getActiveTrip(userId))?.id, first.id);
  await setActiveTrip(second.id, userId);
  assert.equal((await getActiveTrip(userId))?.id, second.id);
});

test("tripStore deletes reservation by reservation id", async () => {
  const userId = `trip-store-reservation-delete-${generateId()}`;
  const reservationId = `res-${generateId()}`;
  const created = await createTrip(
    {
      name: "Trip With Reservation",
      destination: "Chicago",
      startDate: "2026-10-01",
      endDate: "2026-10-03",
      stage: "airport",
      reservations: [
        {
          id: reservationId,
          type: "flight",
          title: "United 142",
          provider: "United",
          localTime: "2026-10-01T08:00:00Z",
          timezone: "Etc/UTC",
          location: "SFO -> ORD",
          confirmationCode: "UNIT42",
          assignedTo: [],
          stage: "airport",
          critical: true,
          confidence: "high",
          notes: "Window seat",
          source: "manual",
        },
      ],
    },
    userId,
  );

  const deleted = await deleteReservationFromTrip(
    {
      tripId: created.id,
      reservationId,
    },
    userId,
  );
  assert.equal(deleted.removed, true);
  assert.equal(deleted.beforeCount, 1);
  assert.equal(deleted.afterCount, 0);
  assert.equal(deleted.trip?.id, created.id);
  assert.equal(deleted.trip?.reservations.length ?? -1, 0);
});
