package com.hortonworks.iotas.catalog;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.hortonworks.iotas.common.Schema;
import com.hortonworks.iotas.storage.PrimaryKey;
import com.hortonworks.iotas.storage.StorableKey;

import java.util.HashMap;
import java.util.Map;

/**
 * Data stream representing an IoTaS topology that will be persisted in
 * storage layer. Generated by UI
 */
public class DataStream extends AbstractStorable {

    public static final String DATA_STREAM_ID = "id";
    public static final String DATA_STREAM_NAME= "name";
    public static final String JSON = "json";
    public static final String TIMESTAMP = "timestamp";

    @Override
    public String toString () {
        return "DataStream{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", json='" + json + '\'' +
                ", timestamp=" + timestamp +
                '}';
    }

    @Override
    public boolean equals (Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;

        DataStream that = (DataStream) o;

        if (id != null ? !id.equals(that.id) : that.id != null)
            return false;
        if (name != null ? !name.equals(that.name) : that.name != null)
            return false;
        if (json != null ? !json.equals(that.json) : that.json != null)
            return false;
        if (timestamp != null ? !timestamp.equals(that.timestamp) : that.timestamp != null)
            return false;

        return true;
    }

    @Override
    public int hashCode () {
        int result = id != null ? id.hashCode() : 0;
        result = 31 * result + (name != null ? name.hashCode() : 0);
        result = 31 * result + (json != null ? json.hashCode() : 0);
        result = 31 * result + (timestamp != null ? timestamp.hashCode() : 0);
        return result;
    }


    /**
     * Unique id identifying a data stream. This is the primary key column.
     */
    private Long id;

    /**
     * Human readable data stream name; input from user from UI.
     */
    private String name;

    /**
     * Json string representing the data stream; generated by UI.
     */
    private String json;

    /**
     * Time at which this data stream was created/updated.
     */
    private Long timestamp;


    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getJson () {
        return json;
    }

    public void setJson (String json) {
        this.json = json;
    }

    public Long getTimestamp () {
        return timestamp;
    }

    public void setTimestamp (Long timestamp) {
        this.timestamp = timestamp;
    }

    @JsonIgnore
    public String getNameSpace () {return "datastreams";}

    @JsonIgnore
    public PrimaryKey getPrimaryKey () {
        Map<Schema.Field, Object> fieldToObjectMap = new HashMap<Schema.Field, Object>();
        fieldToObjectMap.put(new Schema.Field(DATA_STREAM_ID, Schema.Type.LONG),
                this.id);
        return new PrimaryKey(fieldToObjectMap);
    }

    @JsonIgnore
    public StorableKey getStorableKey () {
        return new StorableKey(getNameSpace(), getPrimaryKey());
    }
}
