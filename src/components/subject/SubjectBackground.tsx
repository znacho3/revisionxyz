export default function SubjectBackground({ coverImageUrl }: { coverImageUrl: string }) {
  return (
    <div className="absolute inset-x-0 top-0 z-0 flex h-48 items-center overflow-hidden" style={{ transform: "translateZ(0px)", willChange: "opacity" }}>
      <img alt="" width={64} height={16} decoding="async" className="h-full w-full scale-110 object-cover opacity-50 saturate-125 blur-sm" src={coverImageUrl} style={{ color: "transparent", transform: "translateZ(0px)" }} />
      <div className="absolute inset-x-0 top-0 bottom-0 z-[1] bg-gradient-to-t from-background via-background/40 to-transparent" aria-hidden />
    </div>
  );
}
