//just there to keep everything in place/ ts conventions

export default function WorkflowLayout({
	children,
}: {
	children: React.ReactNode;
}) {
    return (
    <div className="h-full">
        {children}
    </div>
    )
}