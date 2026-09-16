from setuptools import setup, find_packages

setup(
    name="devpulse-sdk",
    version="1.0.0",
    description="Python Telemetry & Observability Middleware for DevPulse AI",
    author="DevPulse AI Team",
    packages=find_packages(),
    install_requires=[
        "httpx>=0.24.0",
        "pydantic>=2.0.0",
    ],
    python_requires=">=3.8",
)
