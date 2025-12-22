import { prisma } from "@/lib/prisma";


/*
w - width, w-full is full screen 
h is height,
m is margin, my is margin y mx is marginx
mb is margin bottom, ml is left, etc etc
the numbers are a bit arcane, i think it's 1/20th
of a page lg is large, xl is extra large

if you want a particular percent or pixel amount do
text-[20px]
square brackets turns tailwind to css, use it for
colors too

Display - flexbox, how an element displays
display-block is full width, inline is text no width
or height, grid is grid flexbox places things relative
to each other

Grid-adds an invisible grid by which items are placed
naturally expands items inside to fill out the cols
completely

flex justify-end aligns the items within container 
to right, space-x-6 adds spacing between elements
flex-col places things on top of each other
ohhh flex commands control the position of the items
relative to each other, and items-center esque
commands control how the items are placed relative to 
nothing

Position - where an element appears relative to 
the container/viewport, fixed, absolute, relative,
sticky (makes it normal until it is scrolled past),

*/
export default async function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-black font-sans dark:bg-black dark:text-zinc-50">
      <p>Hello, world</p>
    </div>
  );
}
