import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { UIMessage } from 'ai';
import type { ComponentProps, HTMLAttributes } from 'react';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage['role'];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      'group flex w-full items-end justify-end gap-2 pt-4 pb-2',
      from === 'user' ? 'is-user' : 'is-assistant flex-row-reverse justify-end',
      '[&>div]:max-w-[85%] sm:[&>div]:max-w-[80%]',
      className,
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({ children, className, ...props }: MessageContentProps) => (
  <div
    className={cn(
      'text-foreground flex flex-col gap-2 overflow-hidden rounded-xl px-4 py-3 text-sm shadow-sm',
      // User message styling
      'group-[.is-user]:bg-gradient-to-br group-[.is-user]:from-blue-500 group-[.is-user]:to-blue-600',
      'group-[.is-user]:text-white group-[.is-user]:shadow-blue-600/25',
      'dark:group-[.is-user]:from-blue-500 dark:group-[.is-user]:to-blue-600',
      'dark:group-[.is-user]:shadow-blue-500/30',
      // Assistant message styling
      'group-[.is-assistant]:bg-gradient-to-br group-[.is-assistant]:from-slate-100 group-[.is-assistant]:to-slate-200/60',
      'group-[.is-assistant]:text-slate-800 group-[.is-assistant]:shadow-slate-400/40',
      'group-[.is-assistant]:border group-[.is-assistant]:border-slate-400/50',
      'dark:group-[.is-assistant]:from-slate-800 dark:group-[.is-assistant]:to-slate-900',
      'dark:group-[.is-assistant]:border-slate-700/60 dark:group-[.is-assistant]:text-slate-100',
      'dark:group-[.is-assistant]:shadow-slate-900/50',
      // Hover effects
      'group-[.is-user]:transition-shadow group-[.is-user]:duration-200 group-[.is-user]:hover:shadow-blue-500/30',
      'group-[.is-assistant]:hover:shadow-slate-300/60 dark:group-[.is-assistant]:hover:shadow-slate-800/60',
      'group-[.is-assistant]:transition-shadow group-[.is-assistant]:duration-200',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export type MessageAvatarProps = ComponentProps<typeof Avatar> & {
  src: string;
  name?: string;
};

export const MessageAvatar = ({ src, name, className, ...props }: MessageAvatarProps) => (
  <Avatar className={cn('ring-border size-8 shadow-sm ring-2', className)} {...props}>
    <AvatarImage alt="" className="mt-0 mb-0" src={src} />
    <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 font-medium text-slate-600 dark:from-slate-700 dark:to-slate-800 dark:text-slate-200">
      {name?.slice(0, 2) || 'ME'}
    </AvatarFallback>
  </Avatar>
);
