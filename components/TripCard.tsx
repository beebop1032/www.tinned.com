import Image from "next/image";
import type { Trip } from "@/lib/types";

export function TripCard({ trip, travelBoxSlug }: { trip: Trip; travelBoxSlug: string }) {
  return (
    <a className="card article-card" href={`/travel-box/${travelBoxSlug}/${trip.slug}`}>
      <div className="card-media">
        <Image
          src={trip.imagePath ?? "/tinned-assets/simple-box.svg"}
          alt=""
          width={132}
          height={96}
        />
      </div>
      <span className="pill">Carnet</span>
      <h3>{trip.title}</h3>
      {trip.excerpt && <p>{trip.excerpt}</p>}
      <span className="box-link">Lire le carnet</span>
    </a>
  );
}
