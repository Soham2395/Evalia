import InterviewCard from "./InterviewCard";
import RevealToggle from "./RevealToggle";

type Props = {
  title: string;
  interviews: any[] | null | undefined;
  userId?: string | null;
};

function SectionBlock({
  heading,
  items,
  userId,
  pageKey,
}: {
  heading: string;
  items: any[];
  userId?: string | null;
  pageKey: string; // e.g., "techPage"
}) {
  if (!items || items.length === 0) return null;
  const PAGE_SIZE = 6;
  const pageItems = items.slice(0, PAGE_SIZE);
  const extraItems = items.slice(PAGE_SIZE);
  return (
    <div className="flex flex-col gap-4 mt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-lg text-light-100/90">{heading}</h3>
        {extraItems.length > 0 && (
          <RevealToggle
            targetId={`extra-${pageKey}`}
            collapsedLabel="View all"
            expandedLabel="View less"
          />
        )}
      </div>
      <div className="interviews-section">
        {pageItems.map((interview: any) => (
          <InterviewCard
            key={interview.id}
            userId={userId || undefined}
            interviewId={interview.id}
            role={interview.role}
            type={interview.type}
            techstack={interview.techstack}
            createdAt={interview.createdAt}
          />
        ))}
      </div>
      {extraItems.length > 0 && (
        <div
          id={`extra-${pageKey}`}
          className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out"
        >
          <div className="overflow-hidden">
            <div className="interviews-section mt-2">
              {extraItems.map((interview: any) => (
                <InterviewCard
                  key={interview.id}
                  userId={userId || undefined}
                  interviewId={interview.id}
                  role={interview.role}
                  type={interview.type}
                  techstack={interview.techstack}
                  createdAt={interview.createdAt}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FilteredInterviewsSection({ title, interviews, userId }: Props) {
  const list = (interviews || []) as any[];

  const technical = list.filter((i) => /technical/i.test(String(i?.type)));
  const behavioral = list.filter((i) => /behavioral/i.test(String(i?.type)));
  const mixed = list.filter((i) => /mix/i.test(String(i?.type)));

  const hasAny = list.length > 0;

  return (
    <section className="flex flex-col gap-4 mt-8">
      <h2>{title}</h2>

      {hasAny ? (
        <>
          <SectionBlock heading="Technical" items={technical} userId={userId} pageKey="techPage" />
          <SectionBlock heading="Behavioral" items={behavioral} userId={userId} pageKey="behPage" />
          <SectionBlock heading="Mixed" items={mixed} userId={userId} pageKey="mixPage" />
        </>
      ) : (
        <p className="text-light-100/70">No interviews available.</p>
      )}
    </section>
  );
}
