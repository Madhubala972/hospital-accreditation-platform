import os
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from huggingface_hub import HfApi

def deploy_to_huggingface(token=None, space_name="cn"):
    print("=" * 60)
    print("🚀 CN Platform - Automated Hugging Face 24/7 Deployment")
    print("=" * 60)
    
    if not token:
        token = os.environ.get("HF_TOKEN")
        
    if not token:
        if len(sys.argv) > 1:
            token = sys.argv[1]
            
    if not token:
        print("\n🔑 Please enter your Hugging Face Access Token.")
        print("   (Get it for free in 5 seconds at: https://huggingface.co/settings/tokens with 'Write' role)")
        token = input("\nEnter HF Token: ").strip()
        
    if not token:
        print("❌ Error: Token is required to deploy.")
        sys.exit(1)

    api = HfApi(token=token)
    
    try:
        user_info = api.whoami(token=token)
        username = user_info["name"]
        print(f"\n✅ Authenticated as: {username}")
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        sys.exit(1)

    repo_id = f"{username}/{space_name}"
    print(f"\n📦 Creating/Verifying Hugging Face Space: {repo_id}...")
    
    try:
        api.create_repo(
            repo_id=repo_id,
            repo_type="space",
            space_sdk="docker",
            exist_ok=True
        )
        print(f"✅ Space repository is ready: https://huggingface.co/spaces/{repo_id}")
    except Exception as e:
        print(f"❌ Failed to create space: {e}")
        sys.exit(1)

    project_root = os.path.dirname(os.path.abspath(__file__))
    print(f"\n📤 Uploading CN codebase to Hugging Face...")
    print("   (Uploading Dockerfile, entrypoint, frontend build, backend, and AI service...)")

    ignore_patterns = [
        "node_modules/**",
        "**/node_modules/**",
        ".git/**",
        "**/.git/**",
        "__pycache__/**",
        "**/__pycache__/**",
        "*.pyc",
        "cloudflared.exe",
        ".env",
        "**/.env"
    ]

    try:
        api.upload_folder(
            folder_path=project_root,
            repo_id=repo_id,
            repo_type="space",
            ignore_patterns=ignore_patterns,
            commit_message="Deploy CN Hospital Quality & Intelligence Platform (24/7 Permanent)"
        )
        print("\n🎉 Deployment upload complete!")
        print("=" * 60)
        print(f"🌐 Permanent 24/7 Live URL:  https://{username.lower()}-{space_name.lower()}.hf.space")
        print(f"⚙️  Space Console / Logs:     https://huggingface.co/spaces/{repo_id}")
        print("=" * 60)
        print("⚡ Hugging Face is now building your Docker container.")
        print("   It will be active and running 24/7 in 2-3 minutes!")
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    token_arg = sys.argv[1] if len(sys.argv) > 1 else None
    deploy_to_huggingface(token=token_arg)
