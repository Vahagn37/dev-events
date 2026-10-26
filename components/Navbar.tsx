import Link from "next/link";
import Image from "next/image";

const Navbar = () => {
    return (
        <header>
            <nav>
                <Link href='/' className="logo">
                    <Image src="/icons/logo.png" alt="logo" width={24} height={24} />

                    <p>DevEvent</p>
                </Link>

                <ul>
                    <li><Link href="/">Home</Link></li>
                    <li><Link href="/#events">Events</Link></li>
                    <li><Link href="/events/new">Create Event</Link></li>
                </ul>
            </nav>
        </header>
    )
}

export default Navbar
