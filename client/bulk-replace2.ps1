$files = @(
    'src/components/custodians/CustodianManager.tsx',
    'src/components/documents/DocumentUpload.tsx',
    'src/components/cases/CaseFormModal.tsx',
    'src/components/review/CodingPanel.tsx',
    'src/pages/LoginPage.tsx',
    'src/pages/NotFoundPage.tsx',
    'src/pages/ProfilePage.tsx',
    'src/pages/ProductionSetsPage.tsx',
    'src/pages/Review.tsx',
    'src/pages/TagsPage.tsx',
    'src/components/modals/CreateCaseModal.tsx',
    'src/components/ui/Card.tsx',
    'src/components/ui/ColorPicker.tsx',
    'src/components/ui/DropdownMenu.tsx',
    'src/components/ui/Button.tsx',
    'src/components/ui/FileDropzone.tsx',
    'src/components/ui/SelectField.tsx',
    'src/components/ui/StatCard.tsx'
)

foreach ($f in $files) {
    if (Test-Path $f) {
        $c = Get-Content $f -Raw
        $o = $c
        # gray replacements
        $c = $c -replace 'text-gray-900', 'text-foreground'
        $c = $c -replace 'text-gray-700', 'text-foreground'
        $c = $c -replace 'text-gray-600', 'text-muted-foreground'
        $c = $c -replace 'text-gray-500', 'text-muted-foreground'
        $c = $c -replace 'text-gray-400', 'text-muted-foreground'
        $c = $c -replace 'text-gray-300', 'text-muted-foreground/40'
        $c = $c -replace 'bg-gray-50', 'bg-muted'
        $c = $c -replace 'bg-gray-100', 'bg-muted'
        $c = $c -replace 'bg-gray-200', 'bg-muted'
        $c = $c -replace 'border-gray-200', 'border-border'
        $c = $c -replace 'border-gray-300', 'border-border'
        $c = $c -replace 'hover:bg-gray-50', 'hover:bg-muted/50'
        $c = $c -replace 'hover:bg-gray-100', 'hover:bg-muted'
        $c = $c -replace 'divide-gray-200', 'divide-border'
        # remaining slate in non-sidebar contexts - convert to design tokens
        $c = $c -replace 'text-slate-900', 'text-foreground'
        $c = $c -replace 'text-slate-800', 'text-foreground'
        $c = $c -replace 'text-slate-700', 'text-foreground'
        $c = $c -replace 'text-slate-600', 'text-muted-foreground'
        $c = $c -replace 'text-slate-500', 'text-muted-foreground'
        $c = $c -replace 'text-slate-400', 'text-muted-foreground'
        $c = $c -replace 'text-slate-300', 'text-muted-foreground/40'
        $c = $c -replace 'bg-slate-50', 'bg-muted'
        $c = $c -replace 'bg-slate-100', 'bg-muted'
        $c = $c -replace 'bg-slate-200', 'bg-muted'
        $c = $c -replace 'border-slate-200', 'border-border'
        $c = $c -replace 'border-slate-100', 'border-border'
        $c = $c -replace 'border-slate-300', 'border-border'
        $c = $c -replace 'hover:bg-slate-50', 'hover:bg-muted/50'
        $c = $c -replace 'hover:bg-slate-100', 'hover:bg-muted'
        $c = $c -replace 'divide-slate-200', 'divide-border'
        # blue -> primary
        $c = $c -replace 'text-blue-600', 'text-primary'
        $c = $c -replace 'text-blue-500', 'text-primary'
        $c = $c -replace 'bg-blue-600', 'bg-primary'
        $c = $c -replace 'bg-blue-500', 'bg-primary'
        $c = $c -replace 'bg-blue-50', 'bg-primary/10'
        $c = $c -replace 'border-blue-200', 'border-primary/20'
        $c = $c -replace 'focus:ring-blue-500', 'focus:ring-primary'
        # green -> success
        $c = $c -replace 'text-green-600', 'text-success'
        $c = $c -replace 'text-green-500', 'text-success'
        $c = $c -replace 'bg-green-50', 'bg-success/10'
        $c = $c -replace 'bg-green-500', 'bg-success'
        # red -> destructive
        $c = $c -replace 'text-red-600', 'text-destructive'
        $c = $c -replace 'text-red-500', 'text-destructive'
        $c = $c -replace 'bg-red-50', 'bg-destructive/10'
        $c = $c -replace 'bg-red-500', 'bg-destructive'
        if ($c -ne $o) {
            Set-Content $f $c -NoNewline
            Write-Host "Fixed: $f"
        } else {
            Write-Host "Unchanged: $f"
        }
    }
}
