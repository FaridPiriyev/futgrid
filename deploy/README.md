# Automatic production deployment

FutGrid can deploy without GitHub Actions. The server uses a `systemd` timer to
check the `main` branch every minute. When a new commit is
available, it builds the API and frontend images in a separate Git worktree,
updates the Compose stack, and checks the API health endpoint and web server.
The live checkout and its server-specific configuration are left untouched. If
the new revision fails those checks, it attempts to restore the previous
application revision.

## Enable on an existing server

Install and enable the timer without rebuilding or restarting the running app:

```bash
sudo bash /usr/local/lib/futgrid-deploy/install-auto-deploy.sh
```

On a new server, `setup-server.sh` runs this installer from the repository after
the initial deployment. The installer configures `main` as the production
branch. The selected branch is saved in `/etc/futgrid/deploy-branch`, and the last
deployed revision is tracked in `/var/lib/futgrid/deployed-revision`. The server
needs outbound HTTPS access to GitHub. For a private repository, configure
read-only Git credentials for the `root` account before enabling the timer.

## Check status and logs

```bash
systemctl status futgrid-auto-deploy.timer
systemctl list-timers futgrid-auto-deploy.timer
journalctl -u futgrid-auto-deploy.service -n 100 --no-pager
```

To check immediately:

```bash
sudo systemctl start futgrid-auto-deploy.service
```

To turn automatic deployment off:

```bash
sudo systemctl disable --now futgrid-auto-deploy.timer
```

## Operational notes

- Deployments are serialized with a lock; a branch force-push or divergence is
  reported and is not deployed automatically.
- Deployment status and history are written to the persistent API storage
  volume so the admin API can display updates while a deploy is running.
- Database migrations run when the API container starts. Keep schema changes
  backward-compatible with the previous application revision (expand/contract);
  application rollback cannot reverse a database migration.
- The deployment service runs as root because Docker administration requires
  root-equivalent access. Keep the server repository and deployment scripts
  writable only by trusted administrators.
