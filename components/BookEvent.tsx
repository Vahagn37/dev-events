'use client';

import {useState} from "react";
import {createBooking} from "@/lib/actions/booking.actions";

const BookEvent = ({ eventId, slug }: { eventId: string, slug: string;}) => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setPending(true);

        try {
            const { success, message: errorMessage } = await createBooking({ eventId, slug, email });

            if (success) {
                setSubmitted(true);
            } else {
                setMessage(errorMessage ?? 'Could not book this event');
            }
        } finally {
            setPending(false);
        }
    }

    return (
        <div id="book-event">
            {submitted ? (
                <p className="text-sm">Thank you for signing up!</p>
            ): (
                <form onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            id="email"
                            placeholder="Enter your email address"
                        />
                    </div>

                    {message ? <p className="text-sm text-red-300">{message}</p> : null}
                    <button type="submit" className="button-submit" disabled={pending}>
                        {pending ? 'Booking…' : 'Submit'}
                    </button>
                </form>
            )}
        </div>
    )
}
export default BookEvent
