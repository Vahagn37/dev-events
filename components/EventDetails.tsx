import React from 'react'
import {notFound} from "next/navigation";
import {IEvent} from "@/database";
import {getSimilarEventsBySlug} from "@/lib/actions/event.actions";
import Image from "next/image";
import BookEvent from "@/components/BookEvent";
import Registrations from "@/components/Registrations";
import EventCard from "@/components/EventCard";
import {cacheLife, cacheTag} from "next/cache";
import {canSeeRegistrations, canViewEvent, countBookings, getEventBySlug, listBookingEmails} from "@/lib/store";

function bookingLine(count: number) {
    if (count <= 0) return 'Be the first to book your spot!';
    if (count === 1) return 'Join 1 person who has already booked their spot!';
    return `Join ${count} people who have already booked their spot!`;
}

const EventDetailItem = ({ icon, alt, label }: { icon: string; alt: string; label: string; }) => (
    <div className="flex-row-gap-2 items-center">
        <Image src={icon} alt={alt} width={17} height={17} />
        <p>{label}</p>
    </div>
)

const EventAgenda = ({ agendaItems }: { agendaItems: string[] }) => (
    <div className="agenda">
        <h2>Agenda</h2>
        <ul>
            {agendaItems.map((item) => (
                <li key={item}>{item}</li>
            ))}
        </ul>
    </div>
)

const EventTags = ({ tags }: { tags: string[] }) => (
    <div className="flex flex-row gap-1.5 flex-wrap">
        {tags.map((tag) => (
            <div className="pill" key={tag}>{tag}</div>
        ))}
    </div>
)

const EventDetails = async ({
    slug,
    viewerId = '',
    viewerRole = 'user',
}: {
    slug: string;
    viewerId?: string;
    viewerRole?: 'user' | 'admin';
}) => {
    'use cache'
    cacheLife('hours');
    cacheTag('events');
    cacheTag(`bookings:${slug}`);

    const event = await getEventBySlug(slug);
    const viewer = viewerId ? { _id: viewerId, role: viewerRole } : null;
    if (!event || !canViewEvent(event, viewer)) return notFound();

    const { description, image, overview, date, time, location, mode, agenda, audience, tags, organizer } = event;

    if(!description) return notFound();

    const bookings = await countBookings(event._id);
    const emails = canSeeRegistrations(event, viewer) ? await listBookingEmails(event._id) : [];

    const similarEvents: IEvent[] = await getSimilarEventsBySlug(slug);

    return (
        <section id="event">
            <div className="header">
                <h1>Event Description</h1>
                <p>{description}</p>
            </div>

            <div className="details">
                {/*    Left Side - Event Content */}
                <div className="content">
                    <Image src={image} alt="Event Banner" width={800} height={800} className="banner" />

                    <section className="flex-col-gap-2">
                        <h2>Overview</h2>
                        <p>{overview}</p>
                    </section>

                    <section className="flex-col-gap-2">
                        <h2>Event Details</h2>

                        <EventDetailItem icon="/icons/calendar.svg" alt="calendar" label={date} />
                        <EventDetailItem icon="/icons/clock.svg" alt="clock" label={time} />
                        <EventDetailItem icon="/icons/pin.svg" alt="pin" label={location} />
                        <EventDetailItem icon="/icons/mode.svg" alt="mode" label={mode} />
                        <EventDetailItem icon="/icons/audience.svg" alt="audience" label={audience} />
                    </section>

                    <EventAgenda agendaItems={agenda} />

                    <section className="flex-col-gap-2">
                        <h2>About the Organizer</h2>
                        <p>{organizer}</p>
                    </section>

                    <EventTags tags={tags} />
                </div>

                {/*    Right Side - Booking Form */}
                <aside className="booking">
                    <div className="signup-card">
                        <h2>Book Your Spot</h2>
                        <p className="text-sm">{bookingLine(bookings)}</p>

                        <BookEvent eventId={event._id} slug={event.slug} />

                        {canSeeRegistrations(event, viewer) ? (
                            <Registrations emails={emails} title={event.title} />
                        ) : null}
                    </div>
                </aside>
            </div>

            <div className="flex w-full flex-col gap-4 pt-20">
                <h2>Similar Events</h2>
                <div className="events">
                    {similarEvents.length > 0 && similarEvents.map((similarEvent: IEvent) => (
                        <EventCard key={similarEvent.title} {...similarEvent} />
                    ))}
                </div>
            </div>
        </section>
    )
}
export default EventDetails
