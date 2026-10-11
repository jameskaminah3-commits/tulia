"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TherapistCard } from "../lib/catalog";

type Filter = "all" | "studio" | "home" | "hotel";

const filters: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All practitioners" },
  { id: "studio", label: "Studio" },
  { id: "home", label: "At home" },
  { id: "hotel", label: "Hotel" },
];

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("");
}

function supports(therapist: TherapistCard, filter: Filter) {
  return filter === "all" || (filter === "studio" && therapist.servesStudio) || (filter === "home" && therapist.servesHome) || (filter === "hotel" && therapist.servesHotel);
}

export function TherapistDirectoryBrowser({ therapists }: { therapists: TherapistCard[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(() => therapists.filter((therapist) => supports(therapist, filter)), [filter, therapists]);

  return <>
    <div className="directory-tools" aria-label="Filter practitioners by setting">
      {filters.map((item) => <button key={item.id} type="button" className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>{item.label}</button>)}
      <span>{visible.length} {visible.length === 1 ? "practitioner" : "practitioners"}</span>
    </div>
    <section className="directory-grid">
      {visible.map((therapist, index) => {
        const services = [therapist.servesStudio && "Studio", therapist.servesHome && "Home", therapist.servesHotel && "Hotel"].filter(Boolean).join(" · ");
        const picture = therapist.photoPath?.startsWith("https://") ? therapist.photoPath : null;
        return <article className="therapist-card directory-card" key={therapist.id}>
          <div className={`therapist-portrait portrait-${index % 3}`}>
            {picture ? <img src={picture} alt={`${therapist.displayName}, Tulia therapist`} /> : <span>{initials(therapist.displayName)}</span>}
            <i />
            <b className="portrait-vetted">Verified Tulia therapist</b>
          </div>
          <div className="therapist-info">
            <p>{therapist.homeZone ? `Based in ${therapist.homeZone}` : "Serving Mombasa"}</p>
            <h2>{therapist.displayName}</h2>
            <span className="therapist-services">{services}</span>
            <small>{therapist.bio ?? "A vetted Tulia practitioner, ready to create a more restorative day."}</small>
            <Link className="profile-book" href="/book">Explore availability <span>→</span></Link>
          </div>
        </article>;
      })}
      {!visible.length && <div className="directory-filter-empty"><b>No matches in this setting yet.</b><p>Try another place, or explore the full collective.</p><button type="button" onClick={() => setFilter("all")}>View all practitioners</button></div>}
    </section>
  </>;
}
