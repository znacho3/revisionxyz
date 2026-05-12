import { HiLightBulb, HiBadgeCheck, HiInformationCircle, HiExclamationCircle } from 'react-icons/hi'
import React from 'react'

interface CalloutProps {
  icon: React.ReactNode
  title: string
  children?: React.ReactNode
  borderColor: string
  titleColor: string
  bgIconColor: string
}

const Callout = ({ icon, title, children, borderColor, titleColor, bgIconColor }: CalloutProps) => (
  <div className={`not-prose relative my-3 max-w-4xl overflow-hidden rounded-2xl border-2 ${borderColor} bg-background p-4 print:break-inside-avoid`}>
    <div className={`mb-3 flex items-center gap-2 font-semibold font-title text-lg ${titleColor}`}>{icon} {title}</div>
    <div className="prose dark:prose-invert">
      <span className="prose prose-neutral dark:prose-invert block space-y-3 text-pretty text-foreground/75 marker:text-inherit print:overflow-hidden print:text-black prose-strong:font-semibold prose-p:m-0 prose-p:inline">
        {children}
      </span>
    <div className={`-rotate-30 -bottom-8 -right-8 absolute pointer-events-none select-none ${bgIconColor}`}>
      {React.isValidElement(icon) ? React.cloneElement(icon, { className: 'text-9xl' }) : icon}
    </div>
    </div>
  </div>
)

export const Tip = (props: { children?: React.ReactNode }) => (
  <Callout title="Tip" borderColor="border-purple-600/25" titleColor="text-purple-700 dark:text-purple-400" bgIconColor="text-purple-900/3 dark:text-purple-100/3" icon={<HiLightBulb className="text-2xl" />}>
    {props.children}
  </Callout> 
)

export const Example = (props: { children?: React.ReactNode }) => (
  <Callout title="Example" borderColor="border-blue-600/25" titleColor="text-blue-700 dark:text-blue-400" bgIconColor="text-blue-900/3 dark:text-blue-100/3" icon={<HiBadgeCheck className="text-2xl" />}>
    {props.children}
  </Callout> 
)

export const Note = (props: { children?: React.ReactNode }) => (
  <Callout title="Note" borderColor="border-green-600/25" titleColor="text-green-700 dark:text-green-400" bgIconColor="text-green-700/7 dark:text-green-300/7" icon={<HiInformationCircle className="text-2xl" />}>
    {props.children}
  </Callout> 
)

export const CommonMistake = (props: { children?: React.ReactNode }) => (
  <Callout title="Common mistake" borderColor="border-red-600/25" titleColor="text-red-600 dark:text-red-400" bgIconColor="text-red-900/3 dark:text-red-100/3" icon={<HiExclamationCircle className="text-2xl" />}>
    {props.children}
  </Callout> 
)