FROM node:24-bookworm

# Install Oracle Instant Client
RUN apt-get update && apt-get install -y libaio1 wget unzip
RUN wget https://download.oracle.com/otn_software/linux/instantclient/2390000/instantclient-basic-linux.x64-23.9.0.25.07.zip
RUN unzip instantclient-basic-linux.x64-23.9.0.25.07.zip -d /opt/oracle && \
    rm instantclient-basic-linux.x64-23.9.0.25.07.zip && \
    ln -s /opt/oracle/instantclient_23_9 /opt/oracle/instantclient && \
    sh -c "echo /opt/oracle/instantclient > /etc/ld.so.conf.d/oracle-instantclient.conf" && \
    ldconfig

COPY wallet/* /opt/oracle/instantclient/network/admin/

WORKDIR /app

COPY package*.json /app/
RUN npm install

COPY . .

CMD ["/bin/bash"]