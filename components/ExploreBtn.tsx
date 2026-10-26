import Image from "next/image";
import Link from "next/link";

const ExploreBtn = () => {
    return (
        <div id="explore-btn" className="mt-7 mx-auto">
            <Link href="/#events">
                Explore Events
                <Image src="/icons/arrow-down.svg" alt="arrow-down" width={24} height={24} />
            </Link>
        </div>
    )
}

export default ExploreBtn
