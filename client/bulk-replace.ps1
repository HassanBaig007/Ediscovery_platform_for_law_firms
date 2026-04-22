$files = Get-ChildItem -Path "src/pages" -Filter "*.tsx" -Recurse
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    $content = $content -replace 'text-slate-900', 'text-foreground'
    $content = $content -replace 'text-slate-800', 'text-foreground'
    $content = $content -replace 'text-slate-700', 'text-foreground'
    $content = $content -replace 'text-slate-600', 'text-muted-foreground'
    $content = $content -replace 'text-slate-500', 'text-muted-foreground'
    $content = $content -replace 'text-slate-400', 'text-muted-foreground'
    $content = $content -replace 'text-slate-300', 'text-muted-foreground/40'
    $content = $content -replace 'bg-slate-50/50', 'bg-background'
    $content = $content -replace 'bg-slate-50', 'bg-muted'
    $content = $content -replace 'bg-slate-100', 'bg-muted'
    $content = $content -replace 'bg-slate-200/50', 'bg-muted'
    $content = $content -replace 'bg-slate-200', 'bg-muted'
    $content = $content -replace 'border-slate-200', 'border-border'
    $content = $content -replace 'border-slate-100', 'border-border'
    $content = $content -replace 'border-slate-300', 'border-border'
    $content = $content -replace 'divide-slate-100', 'divide-border'
    $content = $content -replace 'divide-slate-200', 'divide-border'
    $content = $content -replace 'bg-white', 'bg-card'
    $content = $content -replace 'hover:bg-slate-50', 'hover:bg-muted/50'
    $content = $content -replace 'hover:bg-slate-100', 'hover:bg-muted'
    $content = $content -replace 'text-gray-900', 'text-foreground'
    $content = $content -replace 'text-gray-800', 'text-foreground'
    $content = $content -replace 'text-gray-700', 'text-foreground'
    $content = $content -replace 'text-gray-600', 'text-muted-foreground'
    $content = $content -replace 'text-gray-500', 'text-muted-foreground'
    $content = $content -replace 'text-gray-400', 'text-muted-foreground'
    $content = $content -replace 'text-gray-300', 'text-muted-foreground/40'
    $content = $content -replace 'bg-gray-50', 'bg-muted'
    $content = $content -replace 'bg-gray-100', 'bg-muted'
    $content = $content -replace 'bg-gray-200', 'bg-muted'
    $content = $content -replace 'border-gray-200', 'border-border'
    $content = $content -replace 'border-gray-100', 'border-border'
    $content = $content -replace 'border-gray-300', 'border-border'
    $content = $content -replace 'hover:bg-gray-50', 'hover:bg-muted/50'
    $content = $content -replace 'hover:bg-gray-100', 'hover:bg-muted'
    $content = $content -replace 'divide-gray-200', 'divide-border'
    $content = $content -replace 'text-blue-600', 'text-primary'
    $content = $content -replace 'text-blue-500', 'text-primary'
    $content = $content -replace 'bg-blue-600', 'bg-primary'
    $content = $content -replace 'bg-blue-500', 'bg-primary'
    $content = $content -replace 'bg-blue-50', 'bg-primary/10'
    $content = $content -replace 'bg-blue-100', 'bg-primary/15'
    $content = $content -replace 'border-blue-200', 'border-primary/20'
    $content = $content -replace 'hover:bg-blue-700', 'hover:bg-primary/90'
    $content = $content -replace 'text-green-600', 'text-success'
    $content = $content -replace 'text-green-500', 'text-success'
    $content = $content -replace 'bg-green-50', 'bg-success/10'
    $content = $content -replace 'bg-green-100', 'bg-success/15'
    $content = $content -replace 'bg-green-500', 'bg-success'
    $content = $content -replace 'text-red-600', 'text-destructive'
    $content = $content -replace 'text-red-500', 'text-destructive'
    $content = $content -replace 'bg-red-50', 'bg-destructive/10'
    $content = $content -replace 'bg-red-100', 'bg-destructive/15'
    $content = $content -replace 'bg-red-500', 'bg-destructive'
    $content = $content -replace 'text-yellow-600', 'text-warning'
    $content = $content -replace 'text-yellow-500', 'text-warning'
    $content = $content -replace 'bg-yellow-50', 'bg-warning/10'
    $content = $content -replace 'bg-yellow-100', 'bg-warning/15'
    $content = $content -replace 'text-emerald-600', 'text-success'
    $content = $content -replace 'text-emerald-500', 'text-success'
    $content = $content -replace 'bg-emerald-50', 'bg-success/10'
    $content = $content -replace 'text-amber-600', 'text-warning'
    $content = $content -replace 'text-amber-500', 'text-warning'
    $content = $content -replace 'bg-amber-50', 'bg-warning/10'
    $content = $content -replace 'focus:ring-blue-500', 'focus:ring-primary'
    $content = $content -replace 'ring-blue-500', 'ring-primary'
    $content = $content -replace 'hover:text-blue-600', 'hover:text-primary'
    $content = $content -replace 'hover:border-blue-300', 'hover:border-primary/50'
    if ($content -ne $original) {
        Set-Content $file.FullName $content -NoNewline
        Write-Host "Updated: $($file.Name)"
    } else {
        Write-Host "Unchanged: $($file.Name)"
    }
}

# Also fix components
$compFiles = Get-ChildItem -Path "src/components" -Filter "*.tsx" -Recurse
foreach ($file in $compFiles) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    $content = $content -replace 'text-slate-900', 'text-foreground'
    $content = $content -replace 'text-slate-800', 'text-foreground'
    $content = $content -replace 'text-slate-700', 'text-foreground'
    $content = $content -replace 'text-slate-600', 'text-muted-foreground'
    $content = $content -replace 'text-slate-500', 'text-muted-foreground'
    $content = $content -replace 'text-slate-400', 'text-muted-foreground'
    $content = $content -replace 'text-slate-300', 'text-muted-foreground/40'
    $content = $content -replace 'bg-slate-50', 'bg-muted'
    $content = $content -replace 'bg-slate-100', 'bg-muted'
    $content = $content -replace 'bg-slate-200', 'bg-muted'
    $content = $content -replace 'border-slate-200', 'border-border'
    $content = $content -replace 'border-slate-100', 'border-border'
    $content = $content -replace 'border-slate-300', 'border-border'
    $content = $content -replace 'bg-white', 'bg-card'
    $content = $content -replace 'hover:bg-slate-50', 'hover:bg-muted/50'
    $content = $content -replace 'hover:bg-slate-100', 'hover:bg-muted'
    $content = $content -replace 'divide-slate-200', 'divide-border'
    $content = $content -replace 'text-gray-900', 'text-foreground'
    $content = $content -replace 'text-gray-700', 'text-foreground'
    $content = $content -replace 'text-gray-600', 'text-muted-foreground'
    $content = $content -replace 'text-gray-500', 'text-muted-foreground'
    $content = $content -replace 'text-gray-400', 'text-muted-foreground'
    $content = $content -replace 'bg-gray-50', 'bg-muted'
    $content = $content -replace 'bg-gray-100', 'bg-muted'
    $content = $content -replace 'border-gray-200', 'border-border'
    $content = $content -replace 'border-gray-300', 'border-border'
    $content = $content -replace 'text-blue-600', 'text-primary'
    $content = $content -replace 'bg-blue-600', 'bg-primary'
    $content = $content -replace 'bg-blue-50', 'bg-primary/10'
    $content = $content -replace 'text-green-600', 'text-success'
    $content = $content -replace 'text-red-600', 'text-destructive'
    $content = $content -replace 'text-emerald-600', 'text-success'
    if ($content -ne $original) {
        Set-Content $file.FullName $content -NoNewline
        Write-Host "Updated: $($file.Name)"
    } else {
        Write-Host "Unchanged: $($file.Name)"
    }
}
