$src="node_modules\react-native-windows\target\x64\Debug\Microsoft.ReactNative"
$dst="node_modules\react-native-windows\target\Microsoft.ReactNative"

if (Test-Path "$src\Microsoft.ReactNative.dll") {
  New-Item -ItemType Directory -Force -Path $dst | Out-Null
  Copy-Item "$src\Microsoft.ReactNative.dll" "$dst\Microsoft.ReactNative.dll" -Force
  Copy-Item "$src\Microsoft.ReactNative.winmd" "$dst\Microsoft.ReactNative.winmd" -Force
}