import {Suspense} from "react";
import ExploreBtn from "@/components/ExploreBtn";
import EventList from "@/components/EventList";
import {cacheLife, cacheTag} from "next/cache";

const BASE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
).replace(/\/$/, "");

const Page = async () => {
    'use cache';
    cacheLife('hours');
    cacheTag('events');
    const response = await fetch(`${BASE_URL}/api/events`);
    const { events } = await response.json();

    return (
        <section>
            <h1 className="text-center">The Hub for Every Dev <br /> Event You Can't Miss</h1>
            <p className="text-center mt-5">Hackathons, Meetups, and Conferences, All in One Place</p>

            <ExploreBtn />

            <div id="events" className="mt-20 space-y-7">
                <h3>Featured Events</h3>
                <Suspense fallback={<p className="text-sm text-light-200">Loading events...</p>}>
                    <EventList events={Array.isArray(events) ? events : []} />
                </Suspense>
            </div>
        </section>
    )
}

export default Page;
