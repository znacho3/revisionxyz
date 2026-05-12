import { createFileRoute } from '@tanstack/react-router'
import { CentralIcon } from "@central-icons-react/all";
import { centralIconPropsFilled20 } from "@/lib/icon-props";

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-2 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 lg:pt-12">
      <h1 className="text-4xl font-bold font-manrope tracking-tight text-foreground">
        <span className="text-accent-pirateib">RevisionXYZ</span>: all the resources, <span className="text-accent-pirateib">free for everyone</span>.
      </h1>
      <p className="text-muted-foreground">
        RevisionXYZ gives you access to all the IB notes, questions, cheatsheets, and AI tools you need — completely free.
        No paywall, no account required. If you have any questions, suggestions, or ideas,{' '}
        <a href="https://discord.pirateib.sh/" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">
          join our Discord
        </a>.
      </p>

      <h1 className="text-4xl font-bold font-manrope tracking-tight text-foreground mt-8">
        <span className="text-accent-pirateib">Contributions</span> to the project
      </h1>
      <p className="text-muted-foreground">
        RevisionXYZ is open source. If you are interested in helping, the codebase is available on{' '}
        <a href="https://git.pirateib.sh/pirateIB/rdojo" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">PirateIB Git</a>.
        We are open to contributions — join our <a href="https://discord.pirateib.sh/" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">Discord</a> and let us know.

        <br/><br/>Current roadmap:
        <ul className="list-disc list-inside">
          <li>Scraper for <a href="https://www.revisiondojo.com/ib?view=videos" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">Videos</a> - may need a PRO account</li>
          <li>Scraper for <a href="https://www.revisiondojo.com/ib?view=learn" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">Lessons</a></li>
          <li>Scraper for <a href="https://www.revisiondojo.com/bootcamps" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">Exercises</a></li>
          <li>Scraper for <a href="https://www.revisiondojo.com/vocabulary-practice" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">Vocabulary</a></li>
          <li><a href="https://oneprep.xyz/" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">OnePrep</a> scraper</li>
          <li>Free AI for grading/etc.</li>
        </ul>

        <br/>If you find any problems with the UI or want to improve it, let us know.
      </p>
    </div>
  )

}
