import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import NavAccount from "@/components/NavAccount";

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
                    <li><Link href="/events/new">Create Event</Link></li>
                    <Suspense fallback={null}>
                        <NavAccount />
                    </Suspense>
                </ul>
            </nav>
        </header>
    )
}

export default Navbar
