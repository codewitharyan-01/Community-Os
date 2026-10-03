"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Vote, Users, CalendarDays, MapPin, Clock, HandHeart, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toaster";
import { votePoll, rsvpEvent } from "@/app/actions/community";
import { cn, formatDateTime } from "@/lib/utils";

export type PollDTO = {
  id: string;
  question: string;
  description: string;
  kind: string;
  closed: boolean;
  endsAt: string;
  totalVotes: number;
  hasVoted: boolean;
  myOptionId?: string;
  options: { id: string; label: string; count: number }[];
};

export function PollCard({ poll }: { poll: PollDTO }) {
  const [hasVoted, setHasVoted] = useState(poll.hasVoted);
  const [myOption, setMyOption] = useState(poll.myOptionId);
  const [counts, setCounts] = useState(poll.options.map((o) => o.count));
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const closed = poll.closed || new Date(poll.endsAt) < new Date();
  const showResults = hasVoted || closed;
  const total = counts.reduce((s, c) => s + c, 0);

  function onVote(optionId: string) {
    const idx = poll.options.findIndex((o) => o.id === optionId);
    setHasVoted(true);
    setMyOption(optionId);
    setCounts((c) => c.map((n, i) => (i === idx ? n + 1 : n)));
    startTransition(async () => {
      try {
        await votePoll(poll.id, optionId);
        toast("success", "Vote recorded", "One vote per resident.");
      } catch (err) {
        setHasVoted(false);
        setMyOption(undefined);
        setCounts((c) => c.map((n, i) => (i === idx ? n - 1 : n)));
        toast("error", err instanceof Error ? err.message : "Vote failed");
      }
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-2xs text-muted-foreground">
            <Vote className="w-3.5 h-3.5" />
            <span>{poll.kind === "OFFICIAL" ? "Official governance vote" : "Informal poll"}</span>
            <span>· {poll.totalVotes} votes</span>
          </div>
          <h3 className="text-[15px] font-semibold tracking-tight mt-1.5 leading-snug">{poll.question}</h3>
          {poll.description && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{poll.description}</p>}
        </div>
        <Badge tone={closed ? "gray" : "green"}>{closed ? "Closed" : "Open"}</Badge>
      </div>

      <div className="mt-4 space-y-2">
        {poll.options.map((o, i) => {
          const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
          if (showResults) {
            return (
              <div key={o.id} className={cn("rounded-xl border p-3 relative overflow-hidden", myOption === o.id ? "border-[#0a0a0a]" : "border-[var(--border)]")}>
                {showResults && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute inset-y-0 left-0 bg-[var(--muted)]"
                    aria-hidden
                  />
                )}
                <div className="relative flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    {myOption === o.id && <CheckCircle2 className="w-4 h-4" />}
                    {o.label}
                  </span>
                  <span className="num text-muted-foreground">{pct}% · {counts[i]}</span>
                </div>
              </div>
            );
          }
          return (
            <button
              key={o.id}
              onClick={() => onVote(o.id)}
              disabled={pending}
              className="w-full rounded-xl border border-[var(--border-strong)] p-3 text-left text-sm font-medium hover:border-[#0a0a0a] transition-colors"
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="text-2xs text-muted-foreground mt-3">
        {closed ? "Voting has ended." : `Closes ${formatDateTime(poll.endsAt)}`}
        {!closed && !hasVoted && " · one vote per resident"}
      </p>
    </Card>
  );
}

export type EventDTO = {
  id: string;
  title: string;
  type: string;
  description: string;
  location: string;
  startsAt: string;
  budget: number;
  volunteerSlots: number;
  goingCount: number;
  volunteerCount: number;
  myRsvp?: string;
  myVolunteer: boolean;
  isPast: boolean;
};

export function EventCard({ event }: { event: EventDTO }) {
  const [rsvp, setRsvp] = useState(event.myRsvp);
  const [going, setGoing] = useState(event.goingCount);
  const [volunteered, setVolunteered] = useState(event.myVolunteer);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function onRsvp(choice: "YES" | "NO" | "MAYBE") {
    const prevGoing = rsvp === "YES";
    const nextGoing = choice === "YES";
    setRsvp(choice);
    setGoing((g) => g + (nextGoing ? 1 : 0) - (prevGoing ? 1 : 0));
    startTransition(async () => {
      try {
        await rsvpEvent(event.id, choice, volunteered);
        toast("success", choice === "YES" ? "You're going! 🎉" : choice === "MAYBE" ? "Marked as maybe" : "RSVP updated");
      } catch {
        setRsvp(event.myRsvp);
        setGoing(event.goingCount);
        toast("error", "RSVP failed");
      }
    });
  }

  function onVolunteer() {
    const next = !volunteered;
    setVolunteered(next);
    startTransition(async () => {
      try {
        await rsvpEvent(event.id, (rsvp as "YES") ?? "YES", next);
        toast("success", next ? "Thanks for volunteering! 💚" : "Volunteering cancelled");
      } catch {
        setVolunteered(!next);
        toast("error", "Could not update");
      }
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-2xs text-muted-foreground">
            <CalendarDays className="w-3.5 h-3.5" />
            <span className="capitalize">{event.type.toLowerCase()}</span>
          </div>
          <h3 className="text-[15px] font-semibold tracking-tight mt-1.5">{event.title}</h3>
        </div>
        <Badge tone={event.isPast ? "gray" : "black"}>{event.isPast ? "Past" : "Upcoming"}</Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{formatDateTime(event.startsAt)}</span>
        {event.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{event.location}</span>}
      </p>
      {event.description && <p className="text-sm text-foreground/85 mt-2.5 leading-relaxed">{event.description}</p>}
      <p className="text-2xs text-muted-foreground mt-3 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" /> {going} going
        {event.volunteerSlots > 0 && <> · {event.volunteerCount}/{event.volunteerSlots} volunteers</>}
      </p>
      {!event.isPast && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant={rsvp === "YES" ? "primary" : "secondary"} onClick={() => onRsvp("YES")} disabled={pending}>Going</Button>
          <Button size="sm" variant={rsvp === "MAYBE" ? "primary" : "secondary"} onClick={() => onRsvp("MAYBE")} disabled={pending}>Maybe</Button>
          <Button size="sm" variant={rsvp === "NO" ? "primary" : "secondary"} onClick={() => onRsvp("NO")} disabled={pending}>Can&rsquo;t go</Button>
          {event.volunteerSlots > 0 && (
            <Button size="sm" variant={volunteered ? "primary" : "ghost"} onClick={onVolunteer} disabled={pending} className="ml-auto">
              <HandHeart className="w-4 h-4" /> {volunteered ? "Volunteering" : "Volunteer"}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export type ChannelMessageDTO = {
  id: string;
  body: string;
  authorName: string;
  authorHue: number;
  createdAt: string;
  reactions: { emoji: string; count: number; mine: boolean }[];
};
