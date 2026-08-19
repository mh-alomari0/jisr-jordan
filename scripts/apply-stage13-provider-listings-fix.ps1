param(
  [string]$ProjectRoot = "."
)

$Path = Join-Path $ProjectRoot "lib/actions/provider-listings.ts"

if (-not (Test-Path $Path)) {
  Write-Error "File not found: $Path"
  exit 1
}

$Text = Get-Content -Raw -Encoding UTF8 $Path

# Already patched?
if ($Text -match 'select\("id, is_active"\)' -and
    $Text -match 'select\("id, category_id, is_active"\)') {
  Write-Host "provider-listings.ts already appears to be patched."
  exit 0
}

$CreatePattern = '(?s)    const \{ data: category \} = await supabase\.from\("service_categories"\)\r?\n' +
                 '      \.select\("id, parent_id, is_active"\)\.eq\("id", parsed\.data\.categoryId\)\.eq\("is_active", true\)\.maybeSingle\(\);\r?\n' +
                 '    if \(!category\?\.parent_id\) return \{ success: false as const, error: "[^"]+" \};\r?\n' +
                 '    const \{ data: serviceType \} = await supabase\.from\("services"\)\.select\("id"\)\r?\n' +
                 '      \.eq\("id", parsed\.data\.serviceTypeId\)\.eq\("category_id", parsed\.data\.categoryId\)\.eq\("is_active", true\)\.maybeSingle\(\);\r?\n' +
                 '    if \(!serviceType\) return \{ success: false as const, error: "[^"]+" \};'

$CreateReplacement = @'
    const [{ data: category }, { data: serviceType }] = await Promise.all([
      supabase.from("service_categories")
        .select("id, is_active")
        .eq("id", parsed.data.categoryId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase.from("services")
        .select("id, category_id, is_active")
        .eq("id", parsed.data.serviceTypeId)
        .eq("category_id", parsed.data.categoryId)
        .eq("is_active", true)
        .maybeSingle(),
    ]);
    if (!category) return { success: false as const, error: "Invalid or inactive service category" };
    if (!serviceType) return { success: false as const, error: "Invalid service type for selected category" };
'@

$UpdatePattern = '(?s)    const \{ data: category \} = await supabase\.from\("service_categories"\)\r?\n' +
                 '      \.select\("id, parent_id"\)\.eq\("id", parsed\.data\.categoryId\)\.eq\("is_active", true\)\.maybeSingle\(\);\r?\n' +
                 '    if \(!category\?\.parent_id\) return \{ success: false as const, error: "[^"]+" \};\r?\n' +
                 '    const \{ data: serviceType \} = await supabase\.from\("services"\)\.select\("id"\)\r?\n' +
                 '      \.eq\("id", parsed\.data\.serviceTypeId\)\.eq\("category_id", parsed\.data\.categoryId\)\.eq\("is_active", true\)\.maybeSingle\(\);\r?\n' +
                 '    if \(!serviceType\) return \{ success: false as const, error: "[^"]+" \};'

$UpdateReplacement = @'
    const [{ data: category }, { data: serviceType }] = await Promise.all([
      supabase.from("service_categories")
        .select("id, is_active")
        .eq("id", parsed.data.categoryId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase.from("services")
        .select("id, category_id, is_active")
        .eq("id", parsed.data.serviceTypeId)
        .eq("category_id", parsed.data.categoryId)
        .eq("is_active", true)
        .maybeSingle(),
    ]);
    if (!category) return { success: false as const, error: "Invalid or inactive service category" };
    if (!serviceType) return { success: false as const, error: "Invalid service type for selected category" };
'@

$Original = $Text

$Text = [regex]::Replace($Text, $CreatePattern, $CreateReplacement, 1)
$Text = [regex]::Replace($Text, $UpdatePattern, $UpdateReplacement, 1)

if ($Text -eq $Original) {
  Write-Error "No matching blocks were found. Your local provider-listings.ts differs from the audited GitHub version. No changes were made."
  exit 2
}

Set-Content -Path $Path -Value $Text -Encoding UTF8

Write-Host "Patched successfully: $Path"
Write-Host "Now run:"
Write-Host "  npx tsc --noEmit"
Write-Host "  npx eslint ."
Write-Host "  npm run test"
Write-Host "  npm run build"
