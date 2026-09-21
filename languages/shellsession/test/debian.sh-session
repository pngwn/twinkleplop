(venv) dev@ubuntu:~/app$ pip install -r requirements.txt | tee install.log
Successfully installed flask-3.0.3
dev@ubuntu:~/app$ cat > .env <<'EOF'
> DB_URL="postgres://localhost/$DB"
> EOF
root@ubuntu:/# whoami # should print root
Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease
