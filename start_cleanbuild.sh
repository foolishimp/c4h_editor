# Run from ~/src/apps/c4h_editor_aidev/
cd ~/src/apps/c4h_editor_aidev/ 
./c4h-micro/clean-all.sh 
# Ensure pnpm-lock.yaml is removed by the script if present
# Or manually: rm -f pnpm-lock.yaml
# Run from ~/src/apps/c4h_editor_aidev/
pnpm install
# Run from ~/src/apps/c4h_editor_aidev/
pnpm --filter shared run build