# Android SDK Docker image for building BizScreen TV Player APK
FROM eclipse-temurin:17-jdk-jammy

# Set environment variables
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV GRADLE_HOME=/opt/gradle
ENV PATH="${PATH}:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/build-tools/34.0.0:${GRADLE_HOME}/bin"

# Install required packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Gradle
RUN mkdir -p /opt/gradle && \
    cd /opt && \
    wget -q https://services.gradle.org/distributions/gradle-8.2-bin.zip && \
    unzip -q gradle-8.2-bin.zip && \
    mv gradle-8.2/* gradle/ && \
    rm -rf gradle-8.2 gradle-8.2-bin.zip

# Download and install Android command-line tools
RUN mkdir -p ${ANDROID_HOME}/cmdline-tools && \
    cd ${ANDROID_HOME}/cmdline-tools && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdline-tools.zip && \
    unzip -q cmdline-tools.zip && \
    rm cmdline-tools.zip && \
    mv cmdline-tools latest

# Accept licenses and install required SDK components
RUN yes | sdkmanager --licenses > /dev/null 2>&1 && \
    sdkmanager --install \
        "platform-tools" \
        "platforms;android-34" \
        "build-tools;34.0.0" \
        > /dev/null 2>&1

# Set working directory
WORKDIR /app

# Default command shows help
CMD ["echo", "Run: ./gradlew assembleDebug"]
